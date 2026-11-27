(function () {
	const proto = frappe.ui.form.MultiSelectDialog.prototype;
	if (proto._pi_patched) return;
	proto._pi_patched = true;

	const orig = proto.add_parent_filters;
	proto.add_parent_filters = async function (filters) {
		if (this.doctype !== "Sales Order") return orig.call(this, filters);

		const names = await this.get_filtered_parents_for_child_search();
		// Kalau tidak ada parent yang cocok, paksa hasil kosong, jangan lewati filter
		filters.push(["parent", "in", names.length ? names : ["__none__"]]);
	};
})();

frappe.ui.form.on("Purchase Invoice", {
	refresh(frm) {
		hide_unwanted_connections(frm);
		setup_get_items_from(frm);
		lock_item_code_in_grid(frm);
		override_items_add_row(frm);
		hide_add_multiple_button(frm);
		hide_create_purchase_receipt(frm);
	},
});

// Hide link tertentu di tab Connections
function hide_unwanted_connections(frm) {
	const hide = ["Purchase Order", "Purchase Receipt", "Asset", "Landed Cost Voucher"];
	const hide_cols = ["Auto Repeat"];
	const hide_titles_of = ["Purchase Order"];

	const sel = hide
		.map((dt) => `.pi-hide-conn .document-link[data-doctype="${dt}"]`)
		.concat(
			hide_cols.map(
				(dt) => `.pi-hide-conn .col-md-4:has(> .document-link[data-doctype="${dt}"])`
			)
		)
		.concat(
			hide_titles_of.map(
				(dt) =>
					`.pi-hide-conn .col-md-4:has(> .document-link[data-doctype="${dt}"]) > .form-link-title`
			)
		)
		.join(", ");

	$(frm.wrapper).addClass("pi-hide-conn");
	$("#pi-hide-conn-style").remove();
	$("<style id='pi-hide-conn-style'>")
		.text(`${sel} { display: none !important; }`)
		.appendTo("head");
}

// Ganti menu Get Items From: hide PO/PR, tambah Customer Order (dari Sales Order)
function setup_get_items_from(frm) {
	const GROUP = __("Get Items From");
	const LABEL = __("Customer Order");

	function add_customer_order_button() {
		if (frm.custom_buttons && frm.custom_buttons[LABEL]) return;

		frm.add_custom_button(LABEL, () => open_customer_order_dialog(frm), GROUP);
	}

	function remove_standard_buttons() {
		[__("Purchase Order"), __("Vendor Order"), __("Purchase Receipt")].forEach((label) => {
			try {
				frm.remove_custom_button(label, GROUP);
			} catch (e) {}
		});

		$(frm.wrapper)
			.find('.inner-group-button[data-label="Get%20Items%20From"] .dropdown-menu')
			.find(
				'a[data-label="Vendor%20Order"], a[data-label="Purchase%20Receipt"], a[data-label="Purchase%20Order"]'
			)
			.remove();
	}

	clearInterval(frm._pi_get_items_timer);
	let attempts = 0;
	frm._pi_get_items_timer = setInterval(() => {
		attempts++;
		remove_standard_buttons();
		add_customer_order_button();
		if (attempts >= 12) clearInterval(frm._pi_get_items_timer);
	}, 250);
}

function override_items_add_row(frm) {
	if (frm._pi_add_row_overridden) return;
	const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
	if (!grid) return;

	frm._pi_add_row_overridden = true;

	grid.add_new_row = function () {
		if (!frm.doc.custom_division) {
			frappe.msgprint({
				title: __("Division not selected"),
				message: __("Please select Division before adding items."),
				indicator: "orange",
			});
			return;
		}
		open_customer_order_dialog(frm);
	};
}

function lock_item_code_in_grid(frm) {
	const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
	if (!grid) return;

	grid.update_docfield_property("item_code", "read_only", 1);
	grid.update_docfield_property("qty", "read_only", 1);
	grid.update_docfield_property("custom_customer_order", "read_only", 1);
	grid.refresh();
}

function open_customer_order_dialog(frm) {
	if (!frm.doc.custom_division) {
		frappe.msgprint({
			title: __("Division not selected"),
			message: __("Please select Division before Get Items From."),
			indicator: "orange",
		});
		return;
	}

	const filters = {
		docstatus: 0,
		workflow_state: "To Bill",
		custom_division: frm.doc.custom_division,
	};
	const existing_so_details = (frm.doc.items || [])
		.map((row) => row.custom_so_detail)
		.filter(Boolean);

	show_customer_order_dialog(frm, filters, existing_so_details);
}

function show_customer_order_dialog(frm, filters, existing_so_details) {
	const d = new frappe.ui.Dialog({
		title: __("Customer Order"),
		fields: [
			{
				fieldname: "source_so",
				fieldtype: "Link",
				label: __("Sales Order"),
				options: "Sales Order",
				reqd: 1,
				get_query: () => ({
					query: "tbs_indoprostime.tbs_indoprostime.utils.purchase_invoice.sales_order_query",
					filters: { ...filters, custom_division: frm.doc.custom_division, exclude_so_details: existing_so_details },
				}),
			},
			{
				fieldname: "items",
				fieldtype: "Table",
				label: __("Items"),
				cannot_add_rows: true,
				in_place_edit: false,
				fields: [
					{
						fieldname: "so_detail",
						fieldtype: "Data",
						hidden: 1,
					},
					{
						fieldname: "item_code",
						fieldtype: "Link",
						options: "Item",
						in_list_view: 1,
						label: __("Item Code"),
						read_only: 1,
					},
					{
						fieldname: "item_name",
						fieldtype: "Data",
						in_list_view: 1,
						label: __("Item Name"),
						read_only: 1,
					},
					{
						fieldname: "custom_cost",
						fieldtype: "Currency",
						in_list_view: 1,
						label: __("Cost"),
						read_only: 1,
					},
				],
			},
		],
		primary_action_label: __("Add Items"),
		primary_action: () => {
			const rows = (d.fields_dict.items.df.data || []).filter((row) => row.__checked);
			if (!rows.length) {
				frappe.msgprint(__("Please select at least one item."));
				return;
			}

			const so_name = d.get_value("source_so");
			const so = frappe.model.get_doc("Sales Order", so_name);
			const so_valas = so.custom_valas || "IDR";
			const so_kurs = flt(so.custom_kurs) || 1;

			// Jika PI belum punya currency, ikuti SO pertama
			const is_new_pi = !(frm.doc.items || []).length;
			if (is_new_pi) {
				frappe.model.set_value(frm.doctype, frm.docname, "currency", so_valas);
				frappe.model.set_value(frm.doctype, frm.docname, "exchange_rate", so_kurs);
			}

			const pi_currency = frm.doc.currency || so_valas;
			const pi_rate = flt(frm.doc.exchange_rate) || so_kurs || 1;

			for (const row of rows) {
				const custom_cost = flt(row.custom_cost);
				const rate = pi_currency === so_valas
					? custom_cost
					: (custom_cost * so_kurs) / pi_rate;

				const pi_item = frappe.model.add_child(frm.doc, "Purchase Invoice Item", "items");
				pi_item.item_code = row.item_code;
				pi_item.item_name = row.item_name;
				pi_item.description = row.description;
				pi_item.uom = row.uom;
				pi_item.qty = 1;
				pi_item.rate = rate;
				pi_item.price_list_rate = rate;
				pi_item.amount = rate;
				pi_item.base_rate = rate;
				pi_item.base_amount = rate;
				pi_item.custom_cost = custom_cost;
				pi_item.custom_total_cost = custom_cost;
				pi_item.custom_valas = so_valas;
				pi_item.custom_kurs = so_kurs;
				pi_item.custom_customer_order = so_name;
				pi_item.custom_so_detail = row.so_detail;
				pi_item.sales_order = so_name;
			}

			frm.refresh_field("items");

			// Trigger recalculation of parent totals
			frm.dirty();
			frm.trigger("calculate_taxes_and_totals");

			d.hide();
		},
	});

	d.fields_dict.source_so.$input.on("awesomplete-selectcomplete", () => {
		frappe.run_serially([
			() => {
				const so_name = d.get_value("source_so");
				if (!so_name) {
					d.fields_dict.items.df.data = [];
					d.fields_dict.items.grid.refresh();
					return;
				}

				frappe.model.with_doc("Sales Order", so_name, () => {
					const so = frappe.model.get_doc("Sales Order", so_name);
					frappe.call({
						method:
							"tbs_indoprostime.tbs_indoprostime.utils.purchase_invoice.get_used_so_item_details",
						args: { so_name },
						callback: (r) => {
							if (r.exc) return;
							const used = new Set([...(r.message || []), ...(existing_so_details || [])]);
							const rows = so.items
								.filter((row) => !used.has(row.name))
								.map((row) => ({
									so_detail: row.name,
									item_code: row.item_code,
									item_name: row.item_name,
									custom_cost: row.custom_cost,
									description: row.description,
									uom: row.uom,
									__checked: 0,
								}));
							d.fields_dict.items.df.data = rows;
							d.fields_dict.items.grid.refresh();
						},
					});
				});
			},
		]);
	});

	d.show();
}

function hide_add_multiple_button(frm) {
	if (frm._add_multiple_hidden) return;
	frm._add_multiple_hidden = true;

	$(frm.wrapper).addClass("pi-hide-add-multiple");

	if ($("#pi-hide-add-multiple-style").length) return;

	$("<style id='pi-hide-add-multiple-style'>")
		.text(".pi-hide-add-multiple .grid-add-multiple-rows { display: none !important; }")
		.appendTo("head");
}

function hide_create_purchase_receipt(frm) {
	setTimeout(() => {
		try {
			frm.remove_custom_button(__("Purchase Receipt"), __("Create"));
		} catch (e) {
			// tombol tidak ditemukan, abaikan
		}
	}, 1200);
}
