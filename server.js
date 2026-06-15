const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('contacts.db');

// ==========================================
// 【中介軟體設定區】（一定要放在所有路由前面！）
// ==========================================
// 1. 解析前端傳來的 JSON 資料
app.use(express.json()); 

// 2. 讓 Express 懂得去讀取 public 資料夾內的前端網頁 (index.html)
// 當輸入 http://localhost:3000 時，它會自動跑來這裡抓網頁，不要用 app.get('/') 去攔截它！
app.use(express.static('public')); 


// ==========================================
// 【第三段：資料庫設計】
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);


// ==========================================
// 【第四段：後端 API 實作】
// ==========================================

// 1. GET /contacts (查詢全部聯絡人 / 關鍵字搜尋)
app.get('/contacts', (req, res) => {
    const keyword = req.query.keyword; // 取得前端傳來的 ?keyword=...
    
    if (keyword) {
        // 如果有關鍵字，用 SQL 的 LIKE 進行模糊搜尋（%關鍵字%）
        const rows = db.prepare('SELECT * FROM contacts WHERE name LIKE ?').all(`%${keyword}%`);
        res.json(rows);
    } else {
        // 沒有關鍵字，就跟原本一樣撈出全部
        const rows = db.prepare('SELECT * FROM contacts').all();
        res.json(rows);
    }
});

// 2. POST /contacts (新增一筆聯絡人)
app.post('/contacts', (req, res) => {
  const { name, phone } = req.body;

  // 後端最後防線：檢查電話格式
  const phoneRegex = /^09\d{2}-\d{3}-\d{3}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: '電話格式不符合 09xx-xxx-xxx' });
  }

  const info = db.prepare('INSERT INTO contacts (name, phone) VALUES (?, ?)').run(name, phone);
  res.json({ id: info.lastInsertRowid, name, phone });
});

// 3. PUT /contacts/:id (修改特定 ID 的聯絡人)
app.put('/contacts/:id', (req, res) => {
  const { name, phone } = req.body;

  // ====== 💡 新增：後端 PUT 的電話格式驗證 ======
  const phoneRegex = /^09\d{2}-\d{3}-\d{3}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: '修改失敗！電話格式不符合 09xx-xxx-xxx' });
  }
  // ===========================================

  db.prepare('UPDATE contacts SET name=?, phone=? WHERE id=?').run(name, phone, req.params.id);
  res.json({ id: req.params.id, name, phone });
});

// 4. DELETE /contacts/:id (刪除特定 ID 的聯絡人)
app.delete('/contacts/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});


// ==========================================
// 【伺服器啟動監聽】（永遠留在最底部）
// ==========================================
app.listen(3000, () => {
  console.log('http://localhost:3000');
});