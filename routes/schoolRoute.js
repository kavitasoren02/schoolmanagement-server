const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/config');

const { router } = express()

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/schoolImages';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Validation functions
const validateEmail = (email) => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

const validateContact = (contact) => {
    const contactRegex = /^\d{10}$/;
    return contactRegex.test(contact);
};

// Multer configuration for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/schoolImages/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'school-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image file.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Routes

// GET all schools
router.get('/schools', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM schools ORDER BY created_at DESC'
        );
        connection.release();

        res.json(rows);
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ message: 'Error fetching schools', error: error.message });
    }
});

// POST new school
router.post('/schools', upload.single('image'), async (req, res) => {
    try {
        const { name, address, city, state, contact, email_id } = req.body;

        // Validation
        if (!name || !address || !city || !state || !contact || !email_id) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Validate email
        if (!validateEmail(email_id)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        // Validate contact
        if (!validateContact(contact)) {
            return res.status(400).json({ message: 'Contact must be a 10-digit number' });
        }

        const connection = await pool.getConnection();

        // Insert new school
        const insertQuery = `
          INSERT INTO schools (name, address, city, state, contact, email_id, image) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.execute(insertQuery, [
            name.trim(),
            address.trim(),
            city.trim(),
            state.trim(),
            contact,
            email_id.toLowerCase(),
            req.file.path
        ]);

        // Get the inserted school
        const [rows] = await connection.execute(
            'SELECT * FROM schools WHERE id = ?',
            [result.insertId]
        );

        connection.release();

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating school:', error);

        // Delete uploaded file if database operation failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'School with this email already exists' });
        } else {
            res.status(500).json({ message: 'Error creating school', error: error.message });
        }
    }
});

// GET single school by ID
router.get('/schools/:id', async (req, res) => {
    try {
        const schoolId = req.params.id;

        if (isNaN(schoolId)) {
            return res.status(400).json({ message: 'Invalid school ID' });
        }

        const connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM schools WHERE id = ?',
            [schoolId]
        );
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ message: 'School not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching school:', error);
        res.status(500).json({ message: 'Error fetching school', error: error.message });
    }
});

// DELETE school by ID (optional endpoint)
router.delete('/api/schools/:id', async (req, res) => {
    try {
        const schoolId = req.params.id;

        if (isNaN(schoolId)) {
            return res.status(400).json({ message: 'Invalid school ID' });
        }

        const connection = await pool.getConnection();

        // Get school info first to delete image file
        const [rows] = await connection.execute(
            'SELECT image FROM schools WHERE id = ?',
            [schoolId]
        );

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'School not found' });
        }

        // Delete school from database
        const [result] = await connection.execute(
            'DELETE FROM schools WHERE id = ?',
            [schoolId]
        );

        connection.release();

        // Delete image file
        const imagePath = rows[0].image;
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        res.json({ message: 'School deleted successfully' });
    } catch (error) {
        console.error('Error deleting school:', error);
        res.status(500).json({ message: 'Error deleting school', error: error.message });
    }
});

module.exports = router;