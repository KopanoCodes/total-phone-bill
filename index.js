import express from 'express';
import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';
import cors from 'cors';

const app = express();
app.use(cors())
app.use(express.static('public'))
app.use(express.json())

const db = await sqlite.open({
    filename: './data_plan.db',
    driver: sqlite3.Database
});

await db.migrate();

app.post('/api/phonebill', async (req, res) => {
    try {
        const { price_plan, actions } = req.body;
        const plan = await db.get('SELECT * FROM price_plan WHERE plan_name = ?', price_plan);
        
        if (!plan) {
            return res.status(404).json({ error: 'Price plan not found' });
        }

        const actionList = actions.split(',').map(action => action.trim().toLowerCase());
        const total = actionList.reduce((sum, action) => {
            if (action === 'sms') return sum + plan.sms_price;
            if (action === 'call') return sum + plan.call_price;
            return sum;
        }, 0);

        res.json({ total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/price_plans', async (req, res) => {
    try {
        const plans = await db.all('SELECT * FROM price_plan');
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/price_plan/create', async (req, res) => {
    try {
        const { name, sms_cost, call_cost } = req.body;
        const result = await db.run(
            'INSERT INTO price_plan (plan_name, sms_price, call_price) VALUES (?, ?, ?)',
            [name, sms_cost, call_cost]
        );
        res.json({ id: result.lastID, name, sms_cost, call_cost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/price_plan/update', async (req, res) => {
    try {
        const { name, sms_cost, call_cost } = req.body;
        await db.run(
            'UPDATE price_plan SET sms_price = ?, call_price = ? WHERE plan_name = ?',
            [sms_cost, call_cost, name]
        );
        res.json({ name, sms_cost, call_cost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/price_plan/delete', async (req, res) => {
    try {
        const { id } = req.body;
        await db.run('DELETE FROM price_plan WHERE id = ?', id);
        res.json({ message: 'Price plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
