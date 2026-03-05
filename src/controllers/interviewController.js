const QuestionAnswer = require('../models/questionAnswerModel');
const Space = require('../models/spaceModel');
const Groq = require('groq-sdk');

// Initialize Groq once
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper to call Groq
const callGroq = async (prompt) => {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
  });
  return response.choices[0].message.content;
};


// ================= START INTERVIEW ROUND =================
exports.startRound = async (req, res) => {
  try {
    const { spaceId, roundName } = req.params;
    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).send('Space not found');
    }

    const prompt = `
Based on:
- Job Role: ${space.jobPosition}
- Company: ${space.companyName}
- Job Description: ${space.jobDescription}
- Resume Summary: ${space.purifiedSummary}
- Interview Round: ${roundName}

Generate 10 structured interview questions in numbered format.
`;

    const text = await callGroq(prompt);

    const questions = text
      .split('\n')
      .filter(q => /^\d+\.\s/.test(q.trim()));

    res.json({ questions });

  } catch (err) {
    console.error('Error generating questions:', err);
    res.status(500).send('Error generating interview questions.');
  }
};


// ================= GET QUESTIONS & ANSWERS =================
exports.getQuestionsAnswers = async (req, res) => {
  try {
    const { roundId } = req.params;

    const space = await Space.findOne({
      'interviewRounds._id': roundId
    });

    if (!space) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = space.interviewRounds.find(
      r => r._id.toString() === roundId
    );

    const questionsAnswers = await QuestionAnswer.find({
      spaceId: space._id,
      roundName: round.name
    }).sort({ createdAt: 1 });

    res.json(questionsAnswers);

  } catch (err) {
    console.error('Error fetching questions and answers:', err);
    res.status(500).json({ error: 'Error fetching questions and answers' });
  }
};


// ================= FINISH INTERVIEW ROUND =================
exports.finishRound = async (req, res) => {
  try {
    const { spaceId, roundName } = req.params;
    const { answers } = req.body;

    await QuestionAnswer.insertMany(
      Object.entries(answers).map(([question, answer]) => ({
        spaceId,
        roundName,
        question,
        answer,
      }))
    );

    const summaryPrompt = `
Summarize this interview round:

${Object.entries(answers)
  .map(([q, a]) => `Q: ${q}\nA: ${a}`)
  .join('\n\n')}

Provide:
- Overall evaluation
- Strengths
- Weaknesses
- Improvement suggestions
`;

    const summary = await callGroq(summaryPrompt);

    const space = await Space.findById(spaceId);
    const round = space.interviewRounds.find(r => r.name === roundName);

    round.summary = summary;
    round.status = 'completed';

    await space.save();

    res.status(200).send('Round completed and summary generated.');

  } catch (err) {
    console.error('Error finishing round:', err);
    res.status(500).send('Error finishing round.');
  }
};


// ================= GENERATE FOLLOW-UP QUESTION =================
exports.generateFollowUpQuestions = async (req, res) => {
  try {
    const { questionId } = req.params;
    const questionAnswer = await QuestionAnswer.findById(questionId);

    if (!questionAnswer) {
      return res.status(404).send('Question not found');
    }

    const followupPrompt = `
Original Question: ${questionAnswer.question}
Student Answer: ${questionAnswer.answer}

Generate ONE deep follow-up question.
`;

    const followUpQuestion = await callGroq(followupPrompt);

    await QuestionAnswer.create({
      spaceId: questionAnswer.spaceId,
      roundName: questionAnswer.roundName,
      question: followUpQuestion.trim(),
      isFollowUp: true,
    });

    res.status(200).send('Follow-up question generated successfully.');

  } catch (err) {
    console.error('Error generating follow-up question:', err);
    res.status(500).send('Error generating follow-up question.');
  }
};