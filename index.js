const express = require('express');
const cors = require('cors');
const initializeDatabase = require('./config/init');

const app = express();
const PORT = 3000;

// Initialize Database
initializeDatabase()

// Middleware
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

app.use('/api', require('./routes/schoolRoute'))

app.get("/helth", (req, res) => {
    res.send("Running...")
})

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large' });
        }
    }
    res.status(500).json({ message: error.message });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});