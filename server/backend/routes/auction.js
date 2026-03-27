const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

function initAuctionTables() {
  const db = getDb();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS auction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id INTEGER NOT NULL,
        seller_name TEXT,
        item_key TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_type TEXT NOT NULL,
        icon TEXT DEFAULT '📦',
        starting_price INTEGER NOT NULL,
        current_price INTEGER NOT NULL,
        current_bidder_id INTEGER DEFAULT NULL,
        current_bidder_name TEXT DEFAULT NULL,
        bid_count INTEGER DEFAULT 0,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        item_detail TEXT
      );

      CREATE TABLE IF NOT EXISTS auction_bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auction_id INTEGER NOT NULL,
        bidder_id INTEGER NOT NULL,
        bidder_name TEXT,
        bid_price INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (auction_id) REFERENCES auction_items(id)
      );
    `);
  } finally {
    db.close();
  }
}

initAuctionTables();

// Helper: settle expired auctions
function settleExpiredAuctions() {
  const db = getDb();
  try {
    const expired = db.prepare(`
      SELECT * FROM auction_items
      WHERE status = 'active' AND end_time <= datetime('now')
    `).all();

    for (const auction of expired) {
      if (auction.current_bidder_id) {
        // Transfer item to winner: add to their player_items
        db.prepare(`
          INSERT INTO player_items (user_id, item_key, item_name, item_type, icon, count, source)
          VALUES (?, ?, ?, ?, ?, 1, 'auction_won')
        `).run(auction.current_bidder_id, auction.item_key, auction.item_name, auction.item_type, auction.icon);

        // Refund seller (no commission for now)
        db.prepare(`UPDATE Users SET lingshi = lingshi + ? WHERE id = ?`).run(auction.current_price, auction.seller_id);

        // Mark as sold
        db.prepare(`UPDATE auction_items SET status = 'sold' WHERE id = ?`).run(auction.id);
      } else {
        // No bids — mark as expired
        db.prepare(`UPDATE auction_items SET status = 'expired' WHERE id = ?`).run(auction.id);
      }
    }
  } finally {
    db.close();
  }
}

// GET /api/auction — list active auctions
router.get('/', (req, res) => {
  settleExpiredAuctions();
  const db = getDb();
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const itemType = req.query.item_type || req.query.itemType;

    let sql = `SELECT * FROM auction_items WHERE status = 'active' AND end_time > datetime('now')`;
    let countSql = `SELECT COUNT(*) as total FROM auction_items WHERE status = 'active' AND end_time > datetime('now')`;

    if (itemType) {
      sql += ` AND item_type = ?`;
      countSql += ` AND item_type = ?`;
    }

    sql += ` ORDER BY end_time ASC LIMIT ? OFFSET ?`;

    const params = itemType ? [itemType, pageSize, offset] : [pageSize, offset];
    const countParams = itemType ? [itemType] : [];

    const items = db.prepare(sql).all(...params);
    const { total } = db.prepare(countSql).get(...countParams);

    // Attach time remaining
    const now = Date.now();
    const result = items.map(item => {
      const endMs = new Date(item.end_time).getTime();
      const remaining = Math.max(0, endMs - now);
      const remainingSec = Math.floor(remaining / 1000);
      const hours = Math.floor(remainingSec / 3600);
      const minutes = Math.floor((remainingSec % 3600) / 60);
      return { ...item, remaining_hours: hours, remaining_minutes: minutes, remaining_seconds: remainingSec };
    });

    res.json({
      success: true,
      items: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// POST /api/auction/list — alias for listing (browse)
router.post('/list', (req, res) => {
  // Forward to GET handler by re-parsing
  req.query.item_type = req.body.item_type || req.body.itemType;
  router.handle(req, res);
});

// GET /api/auction/my — my auctions (as seller or bidder)
router.get('/my', (req, res) => {
  const userId = parseInt(req.query.userId || req.query.player_id || req.query.user_id || 1);
  const db = getDb();
  try {
    const selling = db.prepare(`SELECT * FROM auction_items WHERE seller_id = ? ORDER BY created_at DESC`).all(userId);
    const bidding = db.prepare(`SELECT * FROM auction_items WHERE current_bidder_id = ? ORDER BY end_time ASC`).all(userId);
    res.json({ success: true, selling, bidding });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// POST /api/auction/publish — list an item for auction
router.post('/publish', (req, res) => {
  const { player_id, userId, seller_id, item_key, item_name, item_type, icon, starting_price, duration_hours } = req.body;
  const sellerId = parseInt(player_id || userId || seller_id || 1);
  const price = parseInt(starting_price) || 100;
  const duration = parseInt(duration_hours) || 24;

  const db = getDb();
  try {
    // Verify seller has enough spirit stones for listing fee (1% of starting price, min 10)
    const fee = Math.max(10, Math.floor(price * 0.01));
    const seller = db.prepare(`SELECT * FROM Users WHERE id = ?`).get(sellerId);
    if (!seller) {
      return res.json({ success: false, error: 'Player not found' });
    }
    if (seller.lingshi < fee) {
      return res.json({ success: false, error: `Not enough spirit stones for listing fee (need ${fee})` });
    }

    // Deduct listing fee
    db.prepare(`UPDATE Users SET lingshi = lingshi - ? WHERE id = ?`).run(fee, sellerId);

    // Calculate end time
    const endTime = new Date(Date.now() + duration * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const result = db.prepare(`
      INSERT INTO auction_items (seller_id, seller_name, item_key, item_name, item_type, icon, starting_price, current_price, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sellerId, seller.nickname || `Player${sellerId}`, item_key || 'unknown', item_name || 'Unknown Item', item_type || 'material', icon || '📦', price, price, endTime);

    res.json({
      success: true,
      auction_id: result.lastInsertRowid,
      listing_fee: fee,
      end_time: endTime
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// POST /api/auction/bid — place a bid
router.post('/bid', (req, res) => {
  const { auction_id, auctionId, bid_price, player_id, userId, bidder_id } = req.body;
  const id = parseInt(auction_id || auctionId);
  const bidderId = parseInt(player_id || userId || bidder_id || 1);
  const bidPrice = parseInt(bid_price);

  if (!id || !bidPrice) {
    return res.json({ success: false, error: 'Missing auction_id or bid_price' });
  }

  const db = getDb();
  try {
    const auction = db.prepare(`SELECT * FROM auction_items WHERE id = ? AND status = 'active'`).get(id);
    if (!auction) {
      return res.json({ success: false, error: 'Auction not found or already ended' });
    }
    if (auction.end_time <= new Date().toISOString().slice(0, 19)) {
      return res.json({ success: false, error: 'Auction has ended' });
    }
    if (auction.seller_id === bidderId) {
      return res.json({ success: false, error: 'Cannot bid on your own item' });
    }
    if (bidPrice <= auction.current_price) {
      return res.json({ success: false, error: `Bid must be higher than current price (${auction.current_price})` });
    }

    // Refund previous bidder
    if (auction.current_bidder_id) {
      db.prepare(`UPDATE Users SET lingshi = lingshi + ? WHERE id = ?`).run(auction.current_price, auction.current_bidder_id);
    }

    // Deduct bid from new bidder
    const bidder = db.prepare(`SELECT * FROM Users WHERE id = ?`).get(bidderId);
    if (!bidder) {
      return res.json({ success: false, error: 'Bidder not found' });
    }
    if (bidder.lingshi < bidPrice) {
      return res.json({ success: false, error: `Not enough spirit stones (need ${bidPrice})` });
    }
    db.prepare(`UPDATE Users SET lingshi = lingshi - ? WHERE id = ?`).run(bidPrice, bidderId);

    // Record bid
    db.prepare(`INSERT INTO auction_bids (auction_id, bidder_id, bidder_name, bid_price) VALUES (?, ?, ?, ?)`).run(
      id, bidderId, bidder.nickname || `Player${bidderId}`, bidPrice
    );

    // Update auction
    db.prepare(`UPDATE auction_items SET current_price = ?, current_bidder_id = ?, current_bidder_name = ?, bid_count = bid_count + 1 WHERE id = ?`).run(
      bidPrice, bidderId, bidder.nickname || `Player${bidderId}`, id
    );

    res.json({
      success: true,
      current_price: bidPrice,
      bid_count: auction.bid_count + 1
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// POST /api/auction/cancel — cancel an auction (seller only, if no bids)
router.post('/cancel', (req, res) => {
  const { auction_id, auctionId, player_id, userId, seller_id } = req.body;
  const id = parseInt(auction_id || auctionId);
  const sellerId = parseInt(player_id || userId || seller_id || 1);

  const db = getDb();
  try {
    const auction = db.prepare(`SELECT * FROM auction_items WHERE id = ?`).get(id);
    if (!auction) {
      return res.json({ success: false, error: 'Auction not found' });
    }
    if (auction.seller_id !== sellerId) {
      return res.json({ success: false, error: 'Only the seller can cancel' });
    }
    if (auction.bid_count > 0) {
      return res.json({ success: false, error: 'Cannot cancel an auction with bids' });
    }
    if (auction.status !== 'active') {
      return res.json({ success: false, error: 'Auction is not active' });
    }

    // Refund listing fee
    const fee = Math.max(10, Math.floor(auction.starting_price * 0.01));
    db.prepare(`UPDATE Users SET lingshi = lingshi + ? WHERE id = ?`).run(fee, sellerId);

    db.prepare(`UPDATE auction_items SET status = 'cancelled' WHERE id = ?`).run(id);

    res.json({ success: true, message: 'Auction cancelled, listing fee refunded' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// GET /api/auction/:id — get auction detail
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = getDb();
  try {
    settleExpiredAuctions();
    const auction = db.prepare(`SELECT * FROM auction_items WHERE id = ?`).get(id);
    if (!auction) {
      return res.json({ success: false, error: 'Auction not found' });
    }

    // Get bid history
    const bids = db.prepare(`SELECT * FROM auction_bids WHERE auction_id = ? ORDER BY created_at DESC LIMIT 20`).all(id);

    const now = Date.now();
    const endMs = new Date(auction.end_time).getTime();
    const remainingSec = Math.max(0, Math.floor((endMs - now) / 1000));

    res.json({ success: true, auction: { ...auction, remaining_seconds: remainingSec }, bids });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// POST /api/auction/claim — claim won item (for players who won)
router.post('/claim', (req, res) => {
  const { player_id, userId } = req.body;
  const userId2 = parseInt(player_id || userId || 1);

  const db = getDb();
  try {
    settleExpiredAuctions();

    const won = db.prepare(`SELECT * FROM auction_items WHERE current_bidder_id = ? AND status = 'sold' AND end_time <= datetime('now', '-1 second')`).all(userId2);

    // Mark as claimed
    for (const auction of won) {
      db.prepare(`UPDATE auction_items SET status = 'claimed' WHERE id = ?`).run(auction.id);
    }

    res.json({ success: true, claimed: won.length, items: won });
  } catch (err) {
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

module.exports = router;
