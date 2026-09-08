# INDO PROSTIME

## Instalasi

Folder untuk instalasi disini = **cargo**. Lokasi folder silahkan pilih sendiri di system anda

> prerequisites bisa mengacu ke sini : https://docs.frappe.io/framework/user/en/prerequisites

- bench init cargo --frappe-branch version-15 --frappe-path https://github.com/frappe/frappe

- cd cargo/apps
- git clone --depth 1 --branch v15.106.0 https://github.com/frappe/frappe
- git clone --depth 1 --branch v15.105.0 https://github.com/frappe/erpnext
- cd ..
- bench setup requirements
- bench new-site cargoplaza
  > isikan password Root MariaDB
- bench --site cargoplaza install-app erpnext
  > isikan password Administrator baru
- bench --site cargoplaza scheduler enable
- bench use cargoplaza
- bench start

dari web browser http://127.0.0.1:port <---- lihat di console port nya 8001 / 8002

## Install TBS Indoprostime dari git

**1. Generate PAT di GitHub:**

- Buka GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
- Klik **Generate new token**
- Centang scope: `repo`
- Copy tokennya

**2. Clone TBS Indoprostime dari GitHub:**
cargo> bench get-app https://username:PAT_TOKEN@github.com/rickysut/tbs_indoprostime.git --branch main

- cargo> CTRL+C
- cargo> bench start
- dari terminal lain:
  cargo> bench --site cargoplaza install-app tbs_indoprostime
  cargo> bench --site cargoplaza migrate
- kembali ke terminal yg sedang running bench
  cargo> CTRL+C
  cargo> bench start

## Cara Aktivasi Developer Mode di ERPNext

- cargo> bench --site cargoplaza set-config developer_mode 1
- cargo> CTRL+C
- cargo> bench start

## Setup Web App

Login Administrator & gunakan password yg disetup tadi
Ikuti Wizard nya.

- Untuk Company = **Cargo Plaza**.
- Currency = **IDR**
- Chart Of Account = Standard Indonesia
- Demo Transaksi = No

### Website Setting:

- path : /app/website-settings
  - Home Page = /app
  - Title Prefix = CP
  - App Name = Cargo Plaza
  - App Logo: upload logo.png

### Periksa Module Def:

- ketik di Global Search : Module Def List
- pastikan ada ID = TBS Indoprostime , App Name = TBS Indoprostime

### Import Data:

- Folder nya : apps/tbs_indoprostime/ImportData
- 1. Masuk Menu Data Import List -> New -> Document Type = **Sales Person** , import type = **Insert New Record** -> Save -> attach file **Sales Person.xlsx** -> start
- 2. Masuk Menu Data Import List -> New -> Document Type = **Customer** , import type = **Insert New Record** -> Save -> attach file **Customer With Sales Person.xlsx** -> start
- 3. Ulangi untuk file Customer Without Sales Person.
- 4. Mungkin Perlu import dahulu folder "TAX CATEGORY"
- 5. Import Division
- 6. Import Item

---

## Aturan Kerja Qwen

### 1. Selalu Baca Skills Reference

Setiap kali ditanya atau diberi tugas terkait project Cargo, **selalu baca dan gunakan semua skill di `/Volumes/Data/cargo/.qwen/skills/` sebagai referensi** sebelum mengerjakan.

### 2. Langsung Eksekusi

**TANPA planning, tanpa analisa panjang.** Langsung kerjakan tugas dan finish. Hanya output hasil eksekusi — selesai.
