frappe.pages["print_log_report"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Printing Activity Report"),
		single_column: true,
	});

	const refresh_if_ready = () => {
		if (page.print_log_report) page.print_log_report.refresh();
	};

	page.start_date = page.add_field({
		fieldname: "start_date",
		label: __("Start Date"),
		fieldtype: "Date",
		default: frappe.datetime.add_days(frappe.datetime.now_date(), -7),
		change: refresh_if_ready,
	});

	page.end_date = page.add_field({
		fieldname: "end_date",
		label: __("End Date"),
		fieldtype: "Date",
		default: frappe.datetime.now_date(),
		change: refresh_if_ready,
	});

	page.doc_type = page.add_field({
		fieldname: "doc_type",
		label: __("DocType Type"),
		fieldtype: "Select",
		options: "\nCustomer Order\nCustomer Invoice\nVendor Invoice",
		change: refresh_if_ready,
	});

	page.add_inner_button(__("Refresh"), () => page.print_log_report.refresh());

	page.print_log_report = new PrintLogReport(page);
};

class PrintLogReport {
	constructor(page) {
		this.page = page;
		this.data = [];
		this.$wrapper = $(`<div class="print-log-report-content" style="margin-top: 15px;">
			<div class="table-area"></div>
		</div>`).appendTo(page.main);
		this.$table_area = this.$wrapper.find(".table-area");
		this.attach_row_click();
		this.refresh();
	}

	refresh() {
		const start_date = this.page.start_date.get_value();
		const end_date = this.page.end_date.get_value();
		const doc_type = this.page.doc_type.get_value() || "";

		if (!start_date || !end_date) {
			this.render([]);
			return;
		}

		frappe.call({
			method: "tbs_indoprostime.tbs_indoprostime.page.print_log_report.print_log_report.get_logs",
			args: { start_date, end_date, doc_type },
			callback: (r) => {
				this.render(r.message || []);
			},
		});
	}

	render(data) {
		this.data = data;
		this.$table_area.empty();

		if (!data.length) {
			this.$table_area.html(
				`<div class="text-muted text-center" style="padding: 20px;">${__("No records found")}</div>`
			);
			return;
		}

		const columns = [
			{
				name: __("Date"),
				id: "communication_date",
				width: 100,
				format: (value) => frappe.datetime.str_to_user(value, false, true),
			},
			{ name: __("Subject"), id: "subject", width: 650 },
			{ name: __("Status"), id: "status", width: 100, format: () => __("Printed") },
			{
				name: __("Reference DocType"),
				id: "reference_doctype",
				width: 100,
				format: (value) => __(value) || value,
			},
			{
				name: __("Business Partner"),
				id: "timeline_name",
				width: 150,
				format: (value, _row, _column, data) => {
					if (!value || !data || !data.timeline_name) return value;
					return frappe.utils.get_form_link(
						"Business Partner",
						data.timeline_name,
						true,
						value
					);
				},
			},
			{
				name: __("Reference Name"),
				id: "reference_name",
				width: 100,
				format: (value, _row, _column, data) => {
					if (!data || !data.reference_doctype || !data.reference_name) return value;
					return frappe.utils.get_form_link(
						data.reference_doctype,
						data.reference_name,
						true,
						value
					);
				},
			},
			// { name: __("User"), id: "user", width: 120 },
			{ name: __("Full Name"), id: "full_name", width: 200 },
		];

		new frappe.DataTable(this.$table_area.get(0), {
			columns,
			data,
			layout: "fluid",
			serialNoColumn: false,
			checkboxColumn: false,
			noDataMessage: __("No records found"),
		});
	}

	attach_row_click() {
		$("<style>.print-log-report-content .dt-row { cursor: pointer; }</style>").appendTo("head");

		this.$table_area.off("click.print_log_report").on(
			"click.print_log_report",
			".dt-row",
			(e) => {
				if ($(e.target).closest("a").length) return;

				const rowIndex = $(e.currentTarget).data("row-index");
				if (rowIndex == null || !this.data[rowIndex]) return;

				const name = this.data[rowIndex].name;
				if (name) {
					frappe.set_route("Form", "Activity Log", name);
				}
			}
		);
	}
}
