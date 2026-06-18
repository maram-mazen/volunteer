const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const app = express();

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

if (!fs.existsSync("requests.json")) {
    fs.writeFileSync("requests.json", "[]");
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

function readRequests() {
    try {
        if (fs.existsSync("requests.json")) {
            return JSON.parse(fs.readFileSync("requests.json", "utf8"));
        }
        return [];
    } catch (error) {
        return [];
    }
}

function saveRequests(requests) {
    fs.writeFileSync("requests.json", JSON.stringify(requests, null, 2));
}

function getNationalId(item) {
    return String(
        item.national_id ||
        item.id_number ||
        item.nationalId ||
        item.id ||
        ""
    ).trim();
}

function getFullName(item) {
    return (
        item.full_name ||
        item.fullName ||
        item.name ||
        item.username ||
        ""
    );
}

function getDepartment(item) {
    return (
        item.department ||
        item.specialization ||
        item.major ||
        item.specialty ||
        ""
    );
}

app.post("/save", upload.single("attachment"), (req, res) => {
    let requests = readRequests();

    requests.push({
        ...req.body,
        attachment: req.file ? req.file.filename : null,
        status: "pending",
        created_at: new Date().toLocaleString("ar-EG")
    });

    saveRequests(requests);

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تم حفظ الطلب</title>
            <style>
                body{
                    font-family: Arial, sans-serif;
                    background:#f7f3ee;
                    text-align:center;
                    padding-top:100px;
                    direction:rtl;
                }

                .box{
                    background:white;
                    width:450px;
                    margin:auto;
                    padding:35px;
                    border-radius:20px;
                    box-shadow:0 10px 30px rgba(0,0,0,.12);
                }

                h2{
                    color:#871919;
                    margin-bottom:15px;
                }

                p{
                    font-size:19px;
                    line-height:1.8;
                }

                a{
                    display:inline-block;
                    margin:10px;
                    padding:12px 25px;
                    border-radius:25px;
                    text-decoration:none;
                    font-weight:bold;
                }

                .status{
                    background:#d4af37;
                    color:#871919;
                }

                .home{
                    background:#871919;
                    color:white;
                }
            </style>
        </head>

        <body>
            <div class="box">
                <h2>تم حفظ الطلب بنجاح</h2>

                <p>
                    يمكنك الاستعلام عن بيانات الطلب لاحقًا باستخدام رقم الهوية.
                </p>

                <a class="status" href="/status.html">الاستعلام عن الطلب</a>
                <a class="home" href="/index.html">العودة للصفحة الرئيسية</a>
            </div>
        </body>
        </html>
    `);
});

app.get("/requests", (req, res) => {
    const requests = readRequests();
    res.json(requests);
});

app.post("/update-status", (req, res) => {
    let requests = readRequests();

    if (requests[req.body.index]) {
        requests[req.body.index].status = req.body.status;
        saveRequests(requests);
    }

    res.json({ message: "done" });
});

app.post("/delete-request", (req, res) => {
    let requests = readRequests();

    if (requests[req.body.index]) {
        requests.splice(req.body.index, 1);
        saveRequests(requests);
    }

    res.json({ message: "deleted" });
});

app.get("/check-status/:national_id", (req, res) => {
    const requests = readRequests();

    const nationalId = String(req.params.national_id).trim();

    const request = requests.find(item => {
        return getNationalId(item) === nationalId;
    });

    if (!request) {
        return res.json({
            found: false
        });
    }

    res.json({
        found: true,
        full_name: getFullName(request),
        national_id: getNationalId(request),
        department: getDepartment(request),
        status: request.status || "pending",
        created_at: request.created_at || "",
        attachment: request.attachment || null
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
