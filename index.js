const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// CẤU HÌNH CORS: Cho phép GitHub Pages và môi trường localhost truy cập
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://laihoangdo.github.io'
];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép các request không có origin (như mobile apps hoặc curl) 
        // hoặc origin nằm trong danh sách, hoặc bất kỳ sub-domain github.io nào
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.github.io')) {
            callback(null, true);
        } else {
            // Để thuận tiện cho môi trường deploy, bạn cũng có thể mở hoàn toàn bằng callback(null, true)
            callback(null, true); 
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
// CHÈN ĐOẠN NÀY VÀO: Lớp bọc lót trả trạng thái OK (200) cho phương thức OPTIONS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "https://laihoangdo.github.io");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end(); // Ép buộc trả về HTTP OK (200) ngay lập tức
    }
    next();
});

// Kết nối với Supabase qua biến môi trường (Sẽ cấu hình trên Vercel Dashboard)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
    // Sử dụng thư viện chính thức
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
}

// Tuyến đường kiểm tra trạng thái hệ thống
app.get('/', (req, res) => {
    res.json({ 
        status: "online", 
        message: "Hệ thống Backend Quản Lý Địa Bàn đã hoạt động thành công trên Vercel!",
        database_connected: !!supabase
    });
});

// API 1: Đăng nhập hệ thống (Đúng tài khoản demo cskv_binh / password123)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'cskv_binh' && password === 'password123') {
        return res.json({ 
            success: true, 
            message: "Đăng nhập hệ thống thành công!", 
            user: { name: "Nguyễn Văn Bình", role: "CSKV — P.An Lạc", id: "CSKV-BT-024" } 
        });
    }
    // Chế độ demo: Chấp nhận mọi tài khoản khác với cảnh báo
    return res.json({ 
        success: true, 
        message: "Đăng nhập thành công với tư cách Tài khoản khách Demo", 
        user: { name: username || "Khách Demo", role: "Khách tham quan", id: "DEMO-000" } 
    });
});

// API 2: Lấy toàn bộ danh sách hộ dân từ Supabase
app.get('/api/ho-dan', async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ success: false, message: "Chưa cấu hình biến môi trường SUPABASE_URL hoặc SUPABASE_ANON_KEY trên Vercel!" });
    }
    
    try {
        const { data, error } = await supabase
            .from('ho_dan')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi truy vấn cơ sở dữ liệu", error: err.message });
    }
});

// API 3: Thêm một hộ dân mới vào cơ sở dữ liệu Supabase
app.post('/api/ho-dan', async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ success: false, message: "Chưa cấu hình Supabase trên Vercel!" });
    }

    const { soNha, tuyenDuong, loaiHo, hoTen, cccd, sdt, soNhanKhau, ghiChu } = req.body;
    
    if (!soNha || !tuyenDuong || !hoTen) {
        return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ các thông tin bắt buộc (Số nhà, Tuyến đường, Chủ hộ)!" });
    }

    try {
        const { data, error } = await supabase
            .from('ho_dan')
            .insert([
                { 
                    so_nha: soNha, 
                    tuyen_duong: tuyenDuong, 
                    loai_ho: loaiHo, 
                    chu_ho: hoTen, 
                    cccd: cccd || null, 
                    sdt: sdt || null, 
                    so_nhan_khau: parseInt(soNhanKhau) || 1, 
                    ghi_chu: ghiChu || "" 
                }
            ])
            .select();

        if (error) throw error;
        res.json({ success: true, message: "Đã lưu thông tin hộ dân mới vào Database thành công!", data: data[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Không thể thêm dữ liệu vào Database", error: err.message });
    }
});

module.exports = app;
