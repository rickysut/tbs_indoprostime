// Copyright (c) 2026, Team ERP and Contributors
// For license information, please see license.txt

// Suppress cost-center update message for Sales Order only
(function () {
	const original_msgprint = frappe.msgprint;
	frappe.msgprint = function (msg, ...args) {
		let text = typeof msg === "string" ? msg : (msg && msg.message) || "";
		if (
			cur_frm &&
			cur_frm.doc.doctype === "Sales Order" &&
			text.includes("Cost Center for Item rows has been updated")
		) {
			return;
		}
		return original_msgprint.call(this, msg, ...args);
	};
})();

// Override Sales Order form events
frappe.ui.form.on("Sales Order", {
	// onload(frm) {
	// 	// frappe.msgprint("✅ Sales Order JS loaded!");
	// 	if (frm.is_new() && frm.doc.custom_division) {
	// 		ensure_default_item(frm);
	// 	}
	// },

	// customer(frm) {
	// 	// frappe.msgprint(`Division changed: ${frm.doc.custom_division || "(empty)"}`);
	// 	// ensure_default_item(frm);
	// 	// apply_horizontal_alignment(frm, fields_to_align);
	// },
	refresh(frm) {
		let fields_to_align = [
			"custom_division",
			"custom_branch",
			"po_no",
			"po_date",
			"customer",
			"customer_name",
			"transaction_date",
			"custom_sales",
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
			"custom_packing_listed",
			"custom_declared",
			"custom_insurance",
			"custom_carrier",
			"custom_carrier2",
			"custom_carrier3",
			"custom_to",
			"custom_to2",
			"custom_to3",
			"custom_other",
			"custom_other2",
			"custom_other3",
			"custom_agent_charge",
			"custom_carrier_charge",
			"custom_trucking_no",
			"custom_trucking2",
			"custom_voided",
			"custom_posted"
		];
		apply_horizontal_alignment(frm, fields_to_align);
		
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

			const tabLink = $('.form-tabs .nav-link').filter(function () {
                return $(this).text().trim() === 'Connections';
            });

            tabLink.closest('li').hide();

            if (tabLink.hasClass('active')) {
                $('.form-tabs .nav-link').filter(function () {
                    return $(this).text().trim() === 'Details';
                }).tab('show');
            }

			frm.remove_custom_button(__('Quotation'), __('Get Items From'));
		}, 200);

		setTimeout(() => {
            frm.remove_custom_button(__("Pick List"), __("Create"));
            frm.remove_custom_button(__("Material Request"), __("Create"));
            frm.remove_custom_button(__("Request for Raw Materials"), __("Create"));
            frm.remove_custom_button(__("Vendor Order"), __("Create"));
            frm.remove_custom_button(__("Project"), __("Create"));

			frm.add_custom_button(__("Vendor Invoice"), function() {
                make_vendor_invoice(frm);
            }, __("Create"));
        }, 500);

		

		frm.set_query("custom_exporter__shipper", function () {
			return {
				query: "tbs_indoprostime.tbs_indoprostime.overrides.sales_order.exporter_shipper_query",
			};
		});

		frm.set_query("custom_importer__consignee", function () {
			return {
				query: "tbs_indoprostime.tbs_indoprostime.overrides.sales_order.importer_consignee_query",
			};
		});
	},

	custom_division(frm) {
		if (!frm.doc.custom_division) {
			frm.set_value("project", "");
			frm.set_value("cost_center", "");
			return;
		}

		frappe.call({
			method: "tbs_indoprostime.tbs_indoprostime.overrides.sales_order.get_project_and_cost_center",
			args: { division: frm.doc.custom_division },
			callback(r) {
				if (r.message && r.message.project) {
					frm.set_value("project", r.message.project);
					frm.set_value("cost_center", r.message.cost_center);
				}
			},
		});
	},

	custom_valas(frm) {

		setTimeout(() => {
			frm.set_query("item_code", "items", function (doc, cdt, cdn) {
				let filters = {};

				
				if (frm.doc.custom_valas) {
					filters["custom_valas"] = frm.doc.custom_valas;
					filters["disabled"] = 0;
					filters["is_sales_item"] = 1;
				}

				
				return {
					filters: filters,
				};
			});
		}, 200);
		// frm.refresh_field("items");
	},
});
// function ensure_default_item(frm) {
// 	let division = frm.doc.custom_division || "";
// 	if (!division) {
// 		frappe.msgprint({
// 			title: __("Division Required"),
// 			message: __("Please select a Division First."),
// 			indicator: "orange",
// 		});
// 		return;
// 	}
// 	let item_code = division + "000";

// 	let first = frm.doc.items && frm.doc.items[0];

// 	if (first && !first.item_code) {
// 		// First row exists but empty — fill it
// 		frappe.model.set_value(first.doctype, first.name, "item_code", item_code);
// 		frappe.model.set_value(first.doctype, first.name, "qty", 1);
// 		frappe.model.set_value(first.doctype, first.name, "rate", 0);
// 		frappe.model.set_value(first.doctype, first.name, "uom", "Unit");
// 	} else if (!frm.doc.items || frm.doc.items.length === 0) {
// 		// No items at all — add new row
// 		let item = frm.add_child("items");
// 		frappe.model.set_value(item.doctype, item.name, "item_code", item_code);
// 		frappe.model.set_value(item.doctype, item.name, "qty", 1);
// 		frappe.model.set_value(item.doctype, item.name, "rate", 0);
// 		frappe.model.set_value(item.doctype, item.name, "uom", "Unit");
// 	}
// 	// If first row already has item_code, skip

// 	frm.refresh_field("items");
// }

function make_vendor_invoice(frm) {
    frappe.model.with_doctype("Purchase Invoice", () => {
        let pi = frappe.model.get_new_doc("Purchase Invoice");
        pi.company = frm.doc.company;
		pi.cost_center = frm.doc.cost_center;
		pi.project = frm.doc.project;

        frm.doc.items.forEach((row) => {
            let pi_item = frappe.model.add_child(pi, "Purchase Invoice Item", "items");
            pi_item.item_code = row.item_code;
            pi_item.item_name = row.item_name;
            pi_item.description = row.description;
            pi_item.qty = row.qty;
            pi_item.uom = row.uom;
            pi_item.sales_order = frm.doc.name;
        });

        frappe.set_route("Form", "Purchase Invoice", pi.name);
    });
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
