# Agent Instructions

For every task in this repository, always invoke and follow the skill:

- `frappe-erpnext-engineering-assistant:frappe-erpnext-engineering-assistant`

This applies to all code changes, reviews, debugging, migrations, and operational guidance for the Frappe/ERPNext custom app `tbs_indoprostime`.

## Rules

1. **Jangan Over Engineering** — Keep solutions simple; avoid unnecessary abstraction, layers, or cleverness.
2. **Jika Ragu Harus Tanya, Jangan Asumsi Sendiri** — Ask when something is unclear, missing, or could affect behavior; do not silently assume.
3. **Tidak Boleh Menghapus Database Tanpa Disuruh** — Never drop, truncate, or delete data unless explicitly requested and approved.
4. **Untuk Perubahan Besar, Selalu Backup File Lama Nya** — For large changes, preserve the original files or state before overwriting.
