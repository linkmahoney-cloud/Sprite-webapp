import { Client } from '@notionhq/client'
import { getUserFromRequest, supabaseAdmin } from '../_lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const notionKey = process.env.NOTION_API_KEY
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID
  if (!notionKey || !parentPageId) {
    return res.status(400).json({ error: 'Notion not configured' })
  }

  const notion = new Client({ auth: notionKey })

  try {
    // Find or create databases
    const dbIds = await ensureDatabases(notion, parentPageId)
    let synced = { tasks: 0, projects: 0, notes: 0, expenses: 0 }

    // Sync tasks
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)

    for (const task of (tasks || [])) {
      await syncTaskToNotion(notion, dbIds.tasks, task, supabaseAdmin)
      synced.tasks++
    }

    // Sync projects
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', user.id)

    for (const project of (projects || [])) {
      await syncProjectToNotion(notion, dbIds.projects, project, supabaseAdmin)
      synced.projects++
    }

    // Sync notes
    const { data: notes } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('user_id', user.id)

    for (const note of (notes || [])) {
      await syncNoteToNotion(notion, dbIds.notes, note, supabaseAdmin)
      synced.notes++
    }

    // Sync expenses (current month)
    const month = new Date().toISOString().slice(0, 7)
    const { data: expenses } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)

    for (const expense of (expenses || [])) {
      await syncExpenseToNotion(notion, dbIds.expenses, expense, supabaseAdmin)
      synced.expenses++
    }

    res.json({ success: true, synced })
  } catch (error) {
    console.error('Notion sync error:', error.message)
    res.status(500).json({ error: error.message })
  }
}

async function ensureDatabases(notion, parentPageId) {
  // Search for existing databases under the parent page
  const { results } = await notion.search({
    filter: { property: 'object', value: 'database' },
  })

  const find = (title) => results.find(r =>
    r.title?.[0]?.plain_text === title
  )

  const ids = {}

  // Tasks database
  let tasksDb = find('SPRITE Tasks')
  if (!tasksDb) {
    tasksDb = await notion.databases.create({
      parent: { page_id: parentPageId },
      title: [{ text: { content: 'SPRITE Tasks' } }],
      properties: {
        Name: { title: {} },
        Status: { select: { options: [{ name: 'todo' }, { name: 'in_progress' }, { name: 'done' }] } },
        Category: { select: { options: ['S', 'P', 'R', 'I', 'T', 'E'].map(c => ({ name: c })) } },
        Type: { select: { options: [{ name: 'work' }, { name: 'play' }] } },
        Priority: { select: { options: [{ name: 'low' }, { name: 'medium' }, { name: 'high' }] } },
        'Due Date': { date: {} },
        'Est. Minutes': { number: {} },
      },
    })
  }
  ids.tasks = tasksDb.id

  // Projects database
  let projectsDb = find('SPRITE Projects')
  if (!projectsDb) {
    projectsDb = await notion.databases.create({
      parent: { page_id: parentPageId },
      title: [{ text: { content: 'SPRITE Projects' } }],
      properties: {
        Name: { title: {} },
        Status: { select: { options: [{ name: 'active' }, { name: 'archived' }] } },
        Description: { rich_text: {} },
      },
    })
  }
  ids.projects = projectsDb.id

  // Notes database
  let notesDb = find('SPRITE Notes')
  if (!notesDb) {
    notesDb = await notion.databases.create({
      parent: { page_id: parentPageId },
      title: [{ text: { content: 'SPRITE Notes' } }],
      properties: {
        Name: { title: {} },
        Category: { select: { options: ['S', 'P', 'R', 'I', 'T', 'E'].map(c => ({ name: c })) } },
      },
    })
  }
  ids.notes = notesDb.id

  // Expenses database
  let expensesDb = find('SPRITE Expenses')
  if (!expensesDb) {
    expensesDb = await notion.databases.create({
      parent: { page_id: parentPageId },
      title: [{ text: { content: 'SPRITE Expenses' } }],
      properties: {
        Name: { title: {} },
        Category: { select: {} },
        Amount: { number: { format: 'dollar' } },
        'Is Required': { checkbox: {} },
        Date: { date: {} },
        Month: { rich_text: {} },
      },
    })
  }
  ids.expenses = expensesDb.id

  return ids
}

async function syncTaskToNotion(notion, dbId, task, supabase) {
  const properties = {
    Name: { title: [{ text: { content: task.title } }] },
    Status: { select: { name: task.status } },
    Category: { select: { name: task.sprite_category } },
    Type: { select: { name: task.type || 'work' } },
    Priority: { select: { name: task.priority || 'medium' } },
    'Est. Minutes': { number: task.estimated_minutes || 0 },
  }
  if (task.due_date) properties['Due Date'] = { date: { start: task.due_date } }

  if (task.notion_page_id) {
    try {
      await notion.pages.update({ page_id: task.notion_page_id, properties })
      return
    } catch (e) {
      // Page may have been deleted, create new one
    }
  }

  const page = await notion.pages.create({ parent: { database_id: dbId }, properties })
  await supabase.from('tasks').update({ notion_page_id: page.id }).eq('id', task.id)
}

async function syncProjectToNotion(notion, dbId, project, supabase) {
  const properties = {
    Name: { title: [{ text: { content: project.name } }] },
    Status: { select: { name: project.status || 'active' } },
    Description: { rich_text: [{ text: { content: project.description || '' } }] },
  }

  if (project.notion_page_id) {
    try {
      await notion.pages.update({ page_id: project.notion_page_id, properties })
      return
    } catch (e) {}
  }

  const page = await notion.pages.create({ parent: { database_id: dbId }, properties })
  await supabase.from('projects').update({ notion_page_id: page.id }).eq('id', project.id)
}

async function syncNoteToNotion(notion, dbId, note, supabase) {
  const properties = {
    Name: { title: [{ text: { content: note.title } }] },
  }
  if (note.sprite_category) {
    properties.Category = { select: { name: note.sprite_category } }
  }

  if (note.notion_page_id) {
    try {
      await notion.pages.update({ page_id: note.notion_page_id, properties })
      return
    } catch (e) {}
  }

  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties,
    children: note.content ? [{
      object: 'block',
      paragraph: {
        rich_text: [{ text: { content: note.content.slice(0, 2000) } }],
      },
    }] : [],
  })
  await supabase.from('notes').update({ notion_page_id: page.id }).eq('id', note.id)
}

async function syncExpenseToNotion(notion, dbId, expense, supabase) {
  const properties = {
    Name: { title: [{ text: { content: expense.description || expense.category } }] },
    Category: { select: { name: expense.category } },
    Amount: { number: expense.amount },
    'Is Required': { checkbox: expense.is_required },
    Date: { date: { start: expense.date } },
    Month: { rich_text: [{ text: { content: expense.month } }] },
  }

  if (expense.notion_page_id) {
    try {
      await notion.pages.update({ page_id: expense.notion_page_id, properties })
      return
    } catch (e) {}
  }

  const page = await notion.pages.create({ parent: { database_id: dbId }, properties })
  await supabase.from('expenses').update({ notion_page_id: page.id }).eq('id', expense.id)
}
