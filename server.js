import express from 'express';
import cors from 'cors';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar cliente Notion
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (frontend)
app.use(express.static('public'));

// ============================================
// ROTAS DA API
// ============================================

// GET - Listar todas as contas
app.get('/api/accounts', async (req, res) => {
  if (!DATABASE_ID) {
    return res.status(500).json({ error: 'Erro de configuração: NOTION_DATABASE_ID não definido.' });
  }
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
    });

    const accounts = response.results.map(page => pageToAccount(page));
    res.json(accounts);
  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    res.status(500).json({ error: 'Erro ao buscar contas' });
  }
});

// POST - Criar nova conta
app.post('/api/accounts', async (req, res) => {
  if (!DATABASE_ID) {
    return res.status(500).json({ error: 'Erro de configuração: NOTION_DATABASE_ID não definido.' });
  }
  try {
    const { user, niche, email, region, videosPerDay, postTime, backlog, targetLen, caption } = req.body;

    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        'User': { title: [{ text: { content: user } }] },
        'Niche': { rich_text: [{ text: { content: niche } }] },
        'Email': { email: email || null },
        'Region': { rich_text: [{ text: { content: region || '' } }] },
        'Videos Per Day': { number: videosPerDay },
        'Post Time': { rich_text: [{ text: { content: postTime } }] },
        'Backlog': { number: backlog },
        'Target Length': { number: targetLen || 30 },
        'Caption': { rich_text: [{ text: { content: caption || '' } }] },
        'Last Post': { date: null },
      },
    });

    res.json(pageToAccount(response));
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// PUT - Atualizar conta
app.put('/api/accounts/:id', async (req, res) => {
  if (!DATABASE_ID) {
    return res.status(500).json({ error: 'Erro de configuração: NOTION_DATABASE_ID não definido.' });
  }
  try {
    const { id } = req.params;
    const { user, niche, email, region, videosPerDay, postTime, backlog, targetLen, caption, lastPost } = req.body;

    await notion.pages.update({
      page_id: id,
      properties: {
        'User': { title: [{ text: { content: user } }] },
        'Niche': { rich_text: [{ text: { content: niche } }] },
        'Email': { email: email || null },
        'Region': { rich_text: [{ text: { content: region || '' } }] },
        'Videos Per Day': { number: videosPerDay },
        'Post Time': { rich_text: [{ text: { content: postTime } }] },
        'Backlog': { number: backlog },
        'Target Length': { number: targetLen || 30 },
        'Caption': { rich_text: [{ text: { content: caption || '' } }] },
        'Last Post': lastPost ? { date: { start: lastPost } } : { date: null },
      },
    });

    // Buscar a página atualizada
    const page = await notion.pages.retrieve({ page_id: id });
    res.json(pageToAccount(page));
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

// DELETE - Deletar conta
app.delete('/api/accounts/:id', async (req, res) => {
  if (!DATABASE_ID) {
    return res.status(500).json({ error: 'Erro de configuração: NOTION_DATABASE_ID não definido.' });
  }
  try {
    const { id } = req.params;

    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({ error: 'Erro ao deletar conta' });
  }
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function pageToAccount(page) {
  const props = page.properties;

  return {
    id: page.id,
    user: props.User?.title?.[0]?.text?.content || '',
    niche: props.Niche?.rich_text?.[0]?.text?.content || '',
    email: props.Email?.email || '',
    region: props.Region?.rich_text?.[0]?.text?.content || '',
    videosPerDay: props['Videos Per Day']?.number || 1,
    postTime: props['Post Time']?.rich_text?.[0]?.text?.content || '12:00',
    backlog: props.Backlog?.number || 0,
    targetLen: props['Target Length']?.number || 30,
    caption: props.Caption?.rich_text?.[0]?.text?.content || '',
    lastPost: props['Last Post']?.date?.start || null,
  };
}

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 TokTrack servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Database ID: ${DATABASE_ID}`);
});

