const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Đọc thông số cấu hình Cloud Database
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.warn("⚠️ CẢNH BÁO: SUPABASE_URL hoặc SUPABASE_ANON_KEY chưa được khai báo làm biến môi trường!");
}

// Lớp cấu hình an toàn CORS cho Serverless và Preflight Request (OPTIONS)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "https://laihoangdo.github.io");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(cors({
    origin: 'https://laihoangdo.github.io',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

// API 1: Đăng nhập hệ thống (Đồng bộ khớp tài khoản nghiệp vụ của Công an Phường)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'cskv_binh' && password === 'password123') {
        return res.json({ success: true, message: "Đăng nhập thành công", token: "session_token_security_cskv_binh" });
    }
    return res.status(401).json({ success: false, message: "Sai thông tin mật mã!" });
});

// API 2: Lấy toàn bộ danh sách hộ dân từ Supabase Database thật
app.get('/api/ho-dan', async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ success: false, message: "Kết nối Database Supabase chưa được thiết lập." });
    }
    try {
        const { data, error } = await supabase
            .from('ho_dan')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return res.json({ success: true, data: data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// API 3: Thêm một hộ dân mới vào địa bàn
app.post('/api/ho-dan', async (req, res) => {
    if (!supabase) return res.status(500).json({ success: false, message: "Lỗi kết nối DB" });
    const { so_nha, tuyen_duong, loai_ho, chu_ho, cccd, sdt, so_nhan_khau, ghi_chu } = req.body;

    try {
        const { data, error } = await supabase
            .from('ho_dan')
            .insert([{ so_nha, tuyen_duong, loai_ho, chu_ho, cccd, sdt, so_nhan_khau, ghi_chu }])
            .select();

        if (error) throw error;
        return res.json({ success: true, message: "Thêm thành công!", data: data[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// API 4: Cập nhật sửa đổi thông tin hộ dân
app.put('/api/ho-dan/:id', async (req, res) => {
    if (!supabase) return res.status(500).json({ success: false, message: "Lỗi kết nối DB" });
    const { id } = req.params;
    const { so_nha, tuyen_duong, loai_ho, chu_ho, cccd, sdt, so_nhan_khau, ghi_chu } = req.body;

    try {
        const { data, error } = await supabase
            .from('ho_dan')
            .update({ so_nha, tuyen_duong, loai_ho, chu_ho, cccd, sdt, so_nhan_khau, ghi_chu })
            .eq('id', id)
            .select();

        if (error) throw error;
        return res.json({ success: true, message: "Cập nhật thành công!", data: data[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// API 5: Xóa hộ dân khỏi địa bàn quản lý
app.delete('/api/ho-dan/:id', async (req, res) => {
    if (!supabase) return res.status(500).json({ success: false, message: "Lỗi kết nối DB" });
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('ho_dan')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return res.json({ success: true, message: "Xóa hộ dân thành công!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Chạy cục bộ nếu không dùng Serverless Functions
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy cục bộ tại cổng: http://localhost:${PORT}`);
});

module.exports = app;
