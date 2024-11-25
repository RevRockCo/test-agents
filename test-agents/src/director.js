import { Hono } from 'hono';
import { Ai } from '@cloudflare/ai'; // Cloudflare AI library
import calendarAgent from './agents/calendarAgent';
import financialAgent from './agents/financialAgent';
import audienceAgent from './agents/audienceAgent';
import touringAgent from './agents/touringAgent';

const app = new Hono();

// Simplified agent manager
const agents = {
  calendar: calendarAgent,
  financial: financialAgent,
  audience: audienceAgent,
  touring: touringAgent,
};

// Route task function with env properly passed
async function routeTask(agentId, payload, env) {
  const agent = agents[agentId];
  if (!agent) {
    throw new Error(`Agent with ID "${agentId}" not found.`);
  }
  console.log(`Routing task to agent: ${agentId}`);
  return await agent(payload, env); // Pass `env` to the agent
}

// Serve chatbot UI on the root route
app.get('/', (c) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Director Agent Chatbot</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 20px auto;
          padding: 10px;
          background-color: #f4f6f9;
          color: #333;
        }
        h1 {
          text-align: center;
          color: #007bff;
          margin-bottom: 20px;
        }
        textarea {
          width: 100%;
          height: 120px;
          margin-bottom: 10px;
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 5px;
          resize: none;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        button {
          display: block;
          width: 100%;
          padding: 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        button:hover {
          background: #0056b3;
        }
        .response {
          margin-top: 20px;
          padding: 15px;
          border: 1px solid #ccc;
          border-radius: 5px;
          background-color: #fff;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          white-space: pre-wrap;
          font-family: Consolas, 'Courier New', monospace;
        }
      </style>
    </head>
    <body>
      <h1>Director Agent Chatbot</h1>
      <textarea id="query" placeholder="Ask anything..."></textarea>
      <button onclick="sendQuery()">Submit</button>
      <div id="response" class="response">Your response will appear here...</div>
      <script>
        async function sendQuery() {
          const query = document.getElementById('query').value;
          const responseDiv = document.getElementById('response');
          responseDiv.textContent = 'Processing your query...';

          try {
            const res = await fetch('/route-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userQuery: query }),
            });
            const data = await res.json();
            responseDiv.textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            responseDiv.textContent = 'Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `;
  return c.html(html);
});


// Debugging endpoint to check bindings
app.get('/debug', (c) => {
  return c.json({
    availableBindings: Object.keys(c.env),
    AI: c.env.AI ? 'AI binding exists' : 'AI binding is missing',
  });
});

// Main task routing endpoint
app.post('/route-task', async (c) => {
  const { userQuery } = await c.req.json();

  try {
    const ai = new Ai(c.env.AI); // Ensure AI binding is initialized correctly

    const messages = [
      { role: "system", content: "You manage agents. Respond with one of: calendar, financial, audience, touring." },
      { role: "user", content: userQuery },
    ];

    const llamaResponse = await ai.run("@cf/meta/llama-3-8b-instruct", {
      messages,
      stream: false,
    });

    const responseText = llamaResponse.response || llamaResponse.choices[0].message.content;
    const nextAgentId = responseText.toLowerCase().match(/(calendar|financial|audience|touring)/)?.[0];

    if (!nextAgentId) {
      return c.json({
        error: `Invalid agent response: ${responseText}. Expected one of: calendar, financial, audience, touring.`,
      }, 400);
    }

    console.log(`Routing to agent: ${nextAgentId}`);
    const agentResponse = await routeTask(nextAgentId, { query: userQuery }, c.env); // Pass `c.env` here
    return c.json({ agent: nextAgentId, response: agentResponse });
  } catch (error) {
    console.error("Error routing task:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;


// sample query: I want to add a calendar date for my tour, can you help me?
// sample query 2: Hi, can you tell me all of the events I currenlty have in my calendar for this year?


// import { Ai } from '@cloudflare/ai';
// import { Hono } from 'hono';

// const app = new Hono();

// app.get('/', (c) => {
//   return c.text('Hello from Hono with JavaScript!');
// });

// app.get('/agent', async c => {
  
  //   const content = c.req.query("query") || "What is the origin of the phrase Hello, World"
  //   const ai = new Ai(c.env.AI);

//   const messages = [
//     { role: "system", content: "You are a friendly assistant" },
//     { role: "user", content },
//   ];

//   const response_ = await ai.run("@cf/meta/llama-3-8b-instruct", {
//     messages,
//     stream: false,
//   });

//   return c.json(response_);
// });

// export default app;


// Below is a sample of how to access the database
// NOTE: Can't currently access right now as database under another account
// app.get('/db', async (c) => {
//   const db = c.env.HOPE_TREE;

//   try {
//     // Log all tables in the database
//     const tableList = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
//     console.log('Available tables:', tableList);

//     // Try querying the most recent row in daily_schedule
//     const query = `
//       SELECT * 
//       FROM daily_schedule
//       ORDER BY created_at DESC
//       LIMIT 1
//     `;
//     const { results } = await db.prepare(query).all();

//     if (results && results.length > 0) {
//       return c.json(results[0]);
//     } else {
//       return c.text('No rows found in daily_schedule table.', { status: 404 });
//     }
//   } catch (error) {
//     return c.text(`Database query failed: ${error.message}`, { status: 500 });
//   }
// });