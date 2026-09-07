// Copyright (c) 2026, Team ERP and Contributors
// For license information, please see license.txt

// Override Sales Order form events
frappe.ui.form.on("Sales Order", {
	onload(frm) {
		// frappe.msgprint("✅ Sales Order JS loaded!");
		if (frm.is_new() && frm.doc.custom_division) {
			ensure_default_item(frm);
		}
	},

	customer(frm) {
		// frappe.msgprint(`Division changed: ${frm.doc.custom_division || "(empty)"}`);
		ensure_default_item(frm);
		// apply_horizontal_alignment(frm, fields_to_align);
	},
	refresh(frm) {
		let fields_to_align = [
			"custom_division",
			"po_no",
			"po_date",
			"customer",
			"customer_name",
			"transaction_date",
			"custom_sales",
			"custom_ref_",
			"custom_exporter__shipper",
			"custom_importer__consignee",
			"custom_notify_party",
			"custom_overseas_agent",
			"custom_mawb",
			"custom_hawb",
			"custom_etd",
			"custom_eta",
			"custom_origin",
			"custom_destination",
			"custom_remark",
			"custom_issued",
			"custom_date2con",
			"custom_quantity",
			"custom_gross_weight",
			"custom_chgbl_weight",
			"custom_valas",
			"custom_kurs",
			"custom_freight",
			"custom_cost__kg",
			"custom_flight",
			"custom_packing_listed",
			"custom_declared",
			"custom_insurance",
			"custom_carrier",
			"custom_carrier2",
			"custom_carrier3",
		];
		apply_horizontal_alignment(frm, fields_to_align);
		if (frm.doc.custom_valas && frm.doc.currency !== frm.doc.custom_valas) {
			frm.set_value("currency", frm.doc.custom_valas);
			// if (frm.doc.custom_valas === "USD") {
			// 	frm.set_value("debit_to", "110.320 - Account.Receivable (USD) - CP");
			// } else {
			// 	frm.set_value("debit_to", "110.310 - Account.Receivable (IDR) - CP");
			// }
		}
		setTimeout(() => {
			frm.set_query("item_code", "items", function (doc, cdt, cdn) {
				let filters = {};

				// Menggunakan frm.doc sesuai koreksi Anda (lebih aman dan standar)
				if (frm.doc.custom_valas) {
					filters["custom_valas"] = frm.doc.custom_valas;
					filters["disabled"] = 0;
					filters["is_sales_item"] = 1;
				}

				// Ini akan otomatis di-append (di-merge) dengan filter bawaan di gambar Anda
				return {
					filters: filters,
				};
			});
		}, 200);
	},

	custom_valas(frm) {
		if (frm.doc.custom_valas) {
			frm.set_value("currency", frm.doc.custom_valas);
			// if (frm.doc.custom_valas === "USD") {
			// 	frm.set_value("debit_to", "110.320 - Account.Receivable (USD) - CP");
			// } else {
			// 	frm.set_value("debit_to", "110.310 - Account.Receivable (IDR) - CP");
			// }
		}
		setTimeout(() => {
			frm.set_query("item_code", "items", function (doc, cdt, cdn) {
				let filters = {};

				// Menggunakan frm.doc sesuai koreksi Anda (lebih aman dan standar)
				if (frm.doc.custom_valas) {
					filters["custom_valas"] = frm.doc.custom_valas;
					filters["disabled"] = 0;
					filters["is_sales_item"] = 1;
				}

				// Ini akan otomatis di-append (di-merge) dengan filter bawaan di gambar Anda
				return {
					filters: filters,
				};
			});
		}, 200);
		// frm.refresh_field("items");
	},
});
function ensure_default_item(frm) {
	let division = frm.doc.custom_division || "";
	if (!division) {
		frappe.msgprint({
			title: __("Division Required"),
			message: __("Please select a Division First."),
			indicator: "orange",
		});
		return;
	}
	let item_code = division + "000";

	let first = frm.doc.items && frm.doc.items[0];

	if (first && !first.item_code) {
		// First row exists but empty — fill it
		frappe.model.set_value(first.doctype, first.name, "item_code", item_code);
		frappe.model.set_value(first.doctype, first.name, "qty", 1);
		frappe.model.set_value(first.doctype, first.name, "rate", 0);
		frappe.model.set_value(first.doctype, first.name, "uom", "Unit");
	} else if (!frm.doc.items || frm.doc.items.length === 0) {
		// No items at all — add new row
		let item = frm.add_child("items");
		frappe.model.set_value(item.doctype, item.name, "item_code", item_code);
		frappe.model.set_value(item.doctype, item.name, "qty", 1);
		frappe.model.set_value(item.doctype, item.name, "rate", 0);
		frappe.model.set_value(item.doctype, item.name, "uom", "Unit");
	}
	// If first row already has item_code, skip

	frm.refresh_field("items");
}

function apply_horizontal_alignment(frm, fields_to_align) {
	fields_to_align.forEach((field_name) => {
		let f = frm.get_field(field_name);
		if (f) {
			f.$wrapper.find(".form-group").attr("style", function (i, s) {
				return (
					(s || "") +
					"display: flex !important; flex-direction: row !important; align-items: center !important; gap: 10px !important; margin-bottom: 2px !important; margin-top: 0px !important; padding-top: 0px !important;"
				);
			});

			f.$wrapper.find(".control-label").attr("style", function (i, s) {
				let ret = "";

				ret =
					"flex: 0 0 140px !important; min-width: 140px !important; margin-bottom: 12px !important; text-align: left !important; font-weight: normal !important;";

				return (s || "") + ret;
			});

			f.$wrapper.find(".control-input-wrapper").css({
				flex: "1",
				width: "100%",
				"margin-top": "0px",
			});

			let is_numeric = ["Currency", "Float", "Int", "Percent"].includes(f.df.fieldtype);
			let alignment = is_numeric ? "right" : "left";

			f.$wrapper
				.find("input, select, .input-with-feedback, .control-value")
				.attr("style", function (i, s) {
					let style_extra = `width: 100% !important; max-width: 100% !important; height: 28px !important; min-height: 28px !important; text-align: ${alignment} !important;`;

					return (s || "") + style_extra;
				});

			if (is_numeric) {
				f.$wrapper.find("input").css("padding-right", "10px");
			}
			f.$wrapper.find(".control-input, .control-value").css({
				"min-height": "28px",
				height: "auto",
				width: "100%",
			});

			f.$wrapper.find("input, select, .input-with-feedback").attr("style", function (i, s) {
				let sel =
					"width: 100% !important; max-width: 100% !important; height: 28px !important; min-height: 28px !important;";
				return (s || "") + sel;
			});

			if (f.$wrapper.find(".control-input:visible").length > 0) {
				f.$wrapper.find(".control-value").hide();
			}
		}
	});
}
