const path = require('path');
const express = require('express');
const cors = require('cors');
const { saveView, getSubjectSummaries, getSubjectDetail, ensureSubject } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

async function seedSubjects() {
  const starterSubjects = [
    {
      slug: 'economic-freedom',
      title: 'Economic Freedom',
      description: 'Views on free markets, regulation, and financial autonomy at the heart of the Top Gato ethos.'
    },
    {
      slug: 'speech-liberty',
      title: 'Speech Liberty',
      description: 'Perspectives on freedom of expression, censorship, and open debate.'
    },
    {
      slug: 'digital-sovereignty',
      title: 'Digital Sovereignty',
      description: 'How should technology, privacy, and decentralization be governed to protect freedom?'
    }
  ];

  for (const subject of starterSubjects) {
    try {
      await ensureSubject(subject);
    } catch (error) {
      console.error('Failed to ensure subject seed', subject.slug, error);
    }
  }
}

seedSubjects().catch((error) => {
  console.error('Failed to seed starter subjects', error);
});

app.get('/api/subjects', async (req, res, next) => {
  try {
    const summaries = await getSubjectSummaries();
    res.json({ subjects: summaries });
  } catch (error) {
    next(error);
  }
});

app.get('/api/subjects/:slug', async (req, res, next) => {
  try {
    const detail = await getSubjectDetail(req.params.slug.toLowerCase());
    if (!detail) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

app.post('/api/views', async (req, res, next) => {
  try {
    const {
      subjectSlug,
      subjectTitle,
      subjectDescription = '',
      userHandle,
      stance,
      confidence = 50
    } = req.body || {};

    if (!subjectSlug || !subjectTitle || !userHandle || !stance) {
      res.status(400).json({ message: 'subjectSlug, subjectTitle, userHandle, and stance are required.' });
      return;
    }

    await saveView({
      subjectSlug,
      subjectTitle,
      subjectDescription,
      userHandle,
      stance,
      confidence
    });

    const detail = await getSubjectDetail(subjectSlug.toLowerCase());
    res.status(201).json(detail);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'An unexpected error occurred.' });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    return;
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Top Gato hub listening on port ${PORT}`);
});
