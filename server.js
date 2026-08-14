import db from './db/db.js';
import { createApp } from './app.js';
import { seed } from './db/seed.js';

// Make sure there's something to look at on a totally fresh DB.
seed(db);

const app = createApp(db);
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`TaskFlow API listening on http://localhost:${PORT}`);
});
