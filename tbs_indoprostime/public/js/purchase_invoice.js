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

		frm.add_custom_button(
			LABEL,
			() => {
				if (!frm.doc.custom_division) {
					frappe.msgprint({
						title: __("Division belum dipilih"),
						message: __("Pilih Division terlebih dahulu sebelum Get Items From."),
						indicator: "orange",
					});
					return;
				}

				const existing_so = (frm.doc.items || [])
					.map((row) => row.custom_customer_order)
					.filter(Boolean);

				const filters = {
					docstatus: 0,
					workflow_state: "To Bill",
					custom_division: frm.doc.custom_division,
				};
				if (existing_so.length) {
					filters.name = ["not in", existing_so];
				}

				erpnext.utils.map_current_doc({
					method: "tbs_indoprostime.tbs_indoprostime.utils.purchase_invoice.make_purchase_invoice",
					get_query_method:
						"tbs_indoprostime.tbs_indoprostime.utils.purchase_invoice.sales_order_query",
					source_doctype: "Sales Order",
					target: frm,
					setters: {
						transaction_date: undefined,
						customer_name: undefined,
					},
					get_query_filters: filters,
					allow_child_item_selection: false,
					child_fieldname: "items",
					child_columns: ["item_code", "item_name", "custom_cost"],
				});
			},
			GROUP
		);
	}

	function remove_standard_buttons() {
		[__("Purchase Order"), __("Vendor Order"), __("Purchase Receipt")].forEach((label) => {
			try {
				frm.remove_custom_button(label, GROUP);
			} catch (e) {}
		});

		$(frm.wrapper)
			.find('.inner-group-button[data-label="Get%20Items%20From"] .dropdown-menu')
			.find('a[data-label="Vendor%20Order"], a[data-label="Purchase%20Receipt"], a[data-label="Purchase%20Order"]')
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
