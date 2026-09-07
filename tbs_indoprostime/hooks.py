app_name = "tbs_indoprostime"
app_title = "TBS Indoprostime"
app_publisher = "Team ERP"
app_description = "TBS Indoprostime App"
app_email = "digitalone8@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "tbs_indoprostime",
# 		"logo": "/assets/tbs_indoprostime/logo.png",
# 		"title": "TBS Indoprostime",
# 		"route": "/tbs_indoprostime",
# 		"has_permission": "tbs_indoprostime.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/tbs_indoprostime/css/tbs_indoprostime.css"
# app_include_js = "/assets/tbs_indoprostime/js/tbs_indoprostime.js"

# include js in doctype views
doctype_js = {
	"Sales Order": "public/js/sales_order.js"
}

# include js, css files in header of web template
# web_include_css = "/assets/tbs_indoprostime/css/tbs_indoprostime.css"
# web_include_js = "/assets/tbs_indoprostime/js/tbs_indoprostime.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "tbs_indoprostime/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "tbs_indoprostime/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "tbs_indoprostime.utils.jinja_methods",
# 	"filters": "tbs_indoprostime.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "tbs_indoprostime.install.before_install"
# after_install = "tbs_indoprostime.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "tbs_indoprostime.uninstall.before_uninstall"
# after_uninstall = "tbs_indoprostime.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "tbs_indoprostime.utils.before_app_install"
# after_app_install = "tbs_indoprostime.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "tbs_indoprostime.utils.before_app_uninstall"
# after_app_uninstall = "tbs_indoprostime.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "tbs_indoprostime.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
	"Sales Order": "tbs_indoprostime.tbs_indoprostime.overrides.sales_order.CustomSalesOrder"
}

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"tbs_indoprostime.tasks.all"
# 	],
# 	"daily": [
# 		"tbs_indoprostime.tasks.daily"
# 	],
# 	"hourly": [
# 		"tbs_indoprostime.tasks.hourly"
# 	],
# 	"weekly": [
# 		"tbs_indoprostime.tasks.weekly"
# 	],
# 	"monthly": [
# 		"tbs_indoprostime.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "tbs_indoprostime.install.before_tests"

# Overriding Methods
# ------------------------------

override_whitelisted_methods = {
	"erpnext.selling.doctype.sales_order.sales_order.make_purchase_order": "tbs_indoprostime.tbs_indoprostime.overrides.purchase_order.make_purchase_order"
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "tbs_indoprostime.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["tbs_indoprostime.utils.before_request"]
# after_request = ["tbs_indoprostime.utils.after_request"]

# Job Events
# ----------
# before_job = ["tbs_indoprostime.utils.before_job"]
# after_job = ["tbs_indoprostime.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"tbs_indoprostime.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

fixtures = [
    {
        "dt": "Workspace",
        "filters": [["name", "in", ["Cargo Plaza","Accounting", "Buying", "Selling", "Stock", "Financial Reports", "Receivables", "Payables", "Assets", "Users", "CRM"]]]
    },
    {"dt": "Custom Field"},             # Field custom dari Customize Form
    {"dt": "Property Setter"},          # Modifikasi UI/Layout dari Customize Form
    {"dt": "Client Script"},            # JavaScript custom
    {"dt": "Print Format"},             # Format cetak custom
    {"dt": "Document Naming Settings"}, # Naming Setting
    {"dt": "Selling Settings"},         # Selling Setting
    {"dt": "Buying Settings"},         # Buying Setting
	{"dt": "Workflow"},
    {"dt": "Workflow State"},
	{"dt": "Client Script"},
    {"dt": "Server Script"},
    {"dt": "Role"},
    {"dt": "Module Profile"},
    # {"dt": "Custom DocPerm"},
]
