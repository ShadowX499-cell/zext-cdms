# ZEXT JOINT VENTURES Nig. LTD
## Car Dealership Management System (CDMS)
### Product Requirements Document — Version 2.0

---

| Attribute | Detail |
|---|---|
| **Document Title** | Car Dealership Management System (CDMS) |
| **Client** | ZEXT JOINT VENTURES Nig. LTD |
| **Industry** | Automotive Sales — Cars, Accessories, Scooter Bikes |
| **Backend Stack** | Node.js + NestJS |
| **Frontend Stack** | Next.js 15 (React 19) + Tailwind CSS v4 |
| **State Management** | Zustand v5 |
| **Version** | 2.0 |
| **Status** | Draft — For Review & Approval |
| **Classification** | CONFIDENTIAL — Internal Use Only |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Overview](#2-business-overview)
3. [Users & Roles](#3-users--roles)
4. [Authentication & Session Management](#4-authentication--session-management)
5. [Dashboard](#5-dashboard)
6. [Vehicle Registration Module](#6-vehicle-registration-module)
7. [Vehicle Inventory Management](#7-vehicle-inventory-management)
8. [Sales Registration Module](#8-sales-registration-module)
9. [Swap Management Module](#9-swap-management-module)
10. [Accessories & Scooter Bikes Module](#10-accessories--scooter-bikes-module)
11. [Receipt Module](#11-receipt-module)
12. [Revenue & Financial Controls](#12-revenue--financial-controls)
13. [Customer Database](#13-customer-database)
14. [Audit Log](#14-audit-log)
15. [Notifications](#15-notifications)
16. [Security Enhancements](#16-security-enhancements)
17. [Non-Functional Requirements](#17-non-functional-requirements)
18. [Technology Stack](#18-technology-stack)
19. [NestJS Module Architecture](#19-nestjs-module-architecture)
20. [Development Roadmap](#20-development-roadmap)
21. [Glossary](#21-glossary)

---

## 1. Executive Summary

ZEXT JOINT VENTURES Nig. LTD is a Nigerian automotive dealership engaged in the buying, selling, and swapping of cars, car accessories, and scooter bikes. As the business grows, manual record-keeping introduces significant risks: lost transaction records, receipt inconsistencies, revenue leakage, and limited accountability between staff.

This document specifies the requirements for the **Car Dealership Management System (CDMS)** — a secure, web-based internal platform that digitises inventory management, transaction recording, receipt generation, and financial reporting. The system supports two user roles (Super Admin and Secretary), with strict access controls, a secure two-factor login flow, a full audit trail, and an expanded feature set based on stakeholder input.

### Business Objectives

- Eliminate paper-based records for all vehicle purchases, sales, and swaps
- Provide real-time inventory visibility with filtering, search, and vehicle history tracking
- Enforce accountability through role-based access and immutable audit logs
- Generate professional, branded receipts for every transaction type
- Enable the Super Admin to monitor revenue with accuracy and category-level transparency
- Auto-build a searchable customer database from transaction records
- Support future growth: multi-branch expansion, CRM, and analytics

---

## 2. Business Overview

### 2.1 Company Profile

| Attribute | Detail |
|---|---|
| **Company Name** | ZEXT JOINT VENTURES Nig. LTD |
| **Business Type** | Private Limited Company — Automotive Dealership |
| **Core Services** | Buy Cars, Sell Cars, Swap Cars, Car Accessories, Scooter Bikes |
| **Vehicle Categories** | Nigeria Used (NG Used), Foreign Used (Tokunbo / Toks), Scooter Bikes |
| **Operating Country** | Nigeria |
| **System Type** | Internal Web-Based Business Management System |

### 2.2 Problem Statement

Currently, vehicle registration, sales documentation, and receipt issuance are managed manually or across disconnected tools. This results in:

- No single source of truth for available vs. sold inventory
- No vehicle history trail from purchase → availability → sale
- Inconsistent receipt formats between transaction types
- Difficulty reconciling revenue against issued receipts
- No verifiable audit trail when staff actions are disputed
- No organised customer database for repeat engagement
- Risk of data loss through misplaced paperwork

### 2.3 System Scope

**In scope (v2.0):**
- Web application accessible via browser — desktop and tablet optimised
- Two authenticated user roles: Super Admin and Secretary
- Modules: Authentication, Dashboard, Vehicle Registration, Inventory Management, Sales, Swaps, Receipts, Revenue, Accessories & Bikes, Customer Database, Audit Log, Notifications

**Out of scope (v1.0 — future phases):**
- Mobile native app
- E-commerce / public-facing listings
- Third-party payment gateway integration
- Multi-branch management

---

## 3. Users & Roles

### 3.1 Role Overview

| Role | Description |
|---|---|
| **Super Admin** | Full system access. Registers cars, records sales, issues all receipt types, views and manages revenue, manages user accounts, exports reports, views all audit logs, and accesses system settings. |
| **Secretary** | Operational access. Registers cars, records sales, issues receipts (NG Used and Tokunbo), views inventory dashboard. Cannot view revenue totals, manage user accounts, or export financial reports. |

### 3.2 Permission Matrix

| Feature / Module | Super Admin | Secretary |
|---|:---:|:---:|
| Login (2FA via Email OTP) | ✅ | ✅ |
| Dashboard — Inventory Snippets | ✅ Full | ✅ Limited |
| Dashboard — Revenue Summary | ✅ | ❌ |
| Register New Vehicle | ✅ | ✅ |
| Vehicle Photos / Gallery | ✅ | ✅ |
| Vehicle History Tracking | ✅ | ✅ View only |
| Filter / Search Inventory | ✅ | ✅ |
| Low-Stock Alert (Cars) | ✅ | ❌ |
| Register Sold Vehicle | ✅ | ✅ |
| Register Swap Deal | ✅ | ✅ |
| Accessories & Bikes Inventory | ✅ | ✅ |
| Issue NG Used Car Receipt | ✅ | ✅ |
| Issue Tokunbo Car Receipt | ✅ | ✅ |
| Issue Accessories / Bike Receipt | ✅ | ✅ |
| Revenue Dashboard & Reports | ✅ | ❌ |
| Export Revenue (PDF / Excel / CSV) | ✅ | ❌ |
| Customer Database | ✅ | ✅ View + Search |
| View Audit Log (both users) | ✅ | ✅ |
| Filter & Export Audit Log | ✅ | ❌ |
| In-App Notifications | ✅ | ✅ |
| Email Notifications | ✅ | ❌ |
| Manage User Accounts | ✅ | ❌ |
| System Settings | ✅ | ❌ |

---

## 4. Authentication & Session Management

### 4.1 Login Flow

The system uses a two-step authentication flow — email + password followed by a time-limited email OTP — to prevent unauthorised access even if credentials are compromised.

**Step-by-Step:**

1. User navigates to the login page and enters their registered email address and password.
2. System validates credentials. If valid, a **6-digit OTP** is generated and sent to the user's registered email address.
3. A modal/screen prompts the user to enter the OTP. The OTP is valid for **5–10 minutes**.
4. If the OTP matches, a JWT session is created and the user is redirected to their role-specific dashboard.
5. If the OTP is wrong, the user may retry up to **3 times** before the OTP is invalidated and they must request a new one.
6. If login fails **5 consecutive times** (across either step), the account is temporarily locked for **30 minutes** and the Super Admin is notified via email and in-app alert.

### 4.2 Session Rules

| Rule | Specification |
|---|---|
| **Session Timeout** | Automatic logout after 30 minutes of inactivity. User is warned at the 25-minute mark with an in-app banner. |
| **Concurrent Sessions** | Single active session per user. Logging in from a new device invalidates the previous session. |
| **Device / IP Logging** | Each login records device info, browser user-agent, and IP address — stored immutably in the audit log. |
| **OTP Expiry** | OTP expires after 5–10 minutes. User may click 'Resend OTP' once every 60 seconds. |
| **Failed Login Lockout** | 5 consecutive failures lock the account for 30 minutes. Super Admin is notified immediately. |
| **Logout** | Explicit logout button clears JWT tokens and session data immediately. |

### 4.3 Password Policy

- Minimum 8 characters with at least one uppercase letter, one number, and one special character
- Password reset via email link — link valid for 1 hour
- Super Admin can reset any user's password from the User Management panel
- Passwords stored as **bcrypt hashes** (cost factor ≥ 12) — never in plaintext

---

## 5. Dashboard

### 5.1 Super Admin Dashboard

#### 5.1.1 Inventory Summary Cards

Four metric cards at the top of the dashboard:

| Card | Value | Behaviour |
|---|---|---|
| **Available Cars** | Count of unsold vehicles | Clickable — links to full inventory list |
| **Sold Cars** | Count of all sold vehicles | Clickable — links to sold vehicle records |
| **NG Used Cars** | Subset of available: Nigeria Used | Clickable — filtered inventory |
| **Tokunbo (Toks)** | Subset of available: Foreign Used | Clickable — filtered inventory |

#### 5.1.2 Recent Registrations Snippet (Latest 1–5)

Table showing the 5 most recently registered vehicles:
- Date Bought | Vehicle Name | Chassis No. | Category | Status | Actions (View / Edit)

#### 5.1.3 Recent Sales Snippet (Latest 1–5)

Table showing the 5 most recently sold vehicles:
- Date Sold | Vehicle Name | Buyer Name | Mode of Sale | Actions (View Receipt)

#### 5.1.4 Revenue Snapshot *(Admin Only)*

A summary card showing:
- Total Revenue (all time)
- Revenue This Month
- Revenue This Year
- Revenue by Category (Cars / Bikes / Accessories)

Values are auto-calculated from confirmed receipt data.

#### 5.1.5 Quick Action Buttons

- Register New Vehicle
- Register Sold Vehicle
- New Swap Deal
- Issue Receipt

### 5.2 Secretary Dashboard

Simplified view with the same four inventory cards and the two recent snippets (registrations and sales). Revenue data is hidden. Quick actions: Register Vehicle, Register Sale, Issue Receipt.

---

## 6. Vehicle Registration Module

### 6.1 Register New Car (Purchase)

Records every vehicle purchased and brought into inventory. Available to both Super Admin and Secretary.

| Field | Type | Required | Notes / Validation |
|---|---|:---:|---|
| Date Bought | Date | ✅ | Date picker. Defaults to today. Cannot be a future date. |
| Name of Vehicle | Text | ✅ | Full name e.g. Toyota Camry 2018 XLE. Max 150 chars. |
| Vehicle Category | Dropdown | ✅ | Options: NG Used, Tokunbo (Toks), Scooter Bike. Determines receipt template. |
| Chassis Number | Text | ✅ | 17-character VIN. Must be **unique** — system rejects duplicates with reference to existing record. |
| Engine Number | Text | ✅ | Alphanumeric. Uniqueness check recommended. |
| Plate Number | Text | ❌ | Optional at purchase. Can be added/updated later. Nigerian plate format validation. |
| Colour | Text | ✅ | Free text e.g. Pearl White, Midnight Blue. |
| Owner's Name | Text | ✅ | Name of the person selling the vehicle to ZEXT. |
| Mode of Purchase | Dropdown | ✅ | Options: Outright Purchase, Trade-In / Swap, Auction, Consignment. |
| Purchase Price (₦) | Currency | ✅ Admin only | Visible and required for Super Admin. Hidden from Secretary. |
| Vehicle Photos | Image Upload | ❌ | Up to 8 photos. JPG/PNG, max 5MB each. Stored in vehicle gallery. |
| Notes / Remarks | Textarea | ❌ | Internal notes about condition, history, etc. |
| Registered By | Auto | Auto | System auto-fills with logged-in user's name and timestamp. |

**Business Rules:**
- Chassis number must be globally unique. Duplicate submission returns a validation error with the existing record reference.
- Upon saving, vehicle status is set to **Available** and appears in inventory counts.
- Purchase price is only visible to Super Admin — it does not appear on any receipt.
- A registration entry cannot be deleted — only **Archived** by Super Admin (with full audit trail).
- Vehicle Category determines which receipt template is offered when the vehicle is later sold.

---

## 7. Vehicle Inventory Management

This module extends basic registration with advanced tracking, filtering, and alerting capabilities.

### 7.1 Inventory List & Search

All users can access the full inventory list with the following filters and search options:

| Filter / Search | Options |
|---|---|
| **Search** | By vehicle name, chassis number, engine number, plate number, or owner name |
| **Filter by Category** | NG Used, Tokunbo (Toks), Scooter Bike |
| **Filter by Colour** | Free-text colour filter |
| **Filter by Status** | Available, Sold, Swapped, Archived |
| **Filter by Date Range** | Date Bought from–to range |
| **Sort** | By date bought, vehicle name, or category |

### 7.2 Vehicle History Tracking

Each vehicle record maintains a full lifecycle history, viewable from the vehicle detail page:

```
Bought → Available → [Optionally: Listed for Swap] → Sold / Swapped
```

The history timeline shows:

| Event | Details Captured |
|---|---|
| **Registered (Bought)** | Date, purchase price (Admin only), registered by, mode of purchase |
| **Status Changed** | Timestamp, changed by, old status → new status |
| **Sale Recorded** | Date sold, buyer name, selling price, mode of sale, registered by |
| **Swap Recorded** | Date, incoming vehicle, cash difference, registered by |
| **Receipt Issued** | Receipt number, date issued, issued by |
| **Record Edited** | Field changed, old value → new value, edited by, timestamp |
| **Archived** | Date, reason, archived by |

### 7.3 Vehicle Photos / Image Gallery

- Each vehicle supports up to **8 photos** uploaded at registration or any time afterward
- Photos are displayed in a gallery view on the vehicle detail page
- Supported formats: JPG, PNG — max 5MB per photo
- Photos can be added or deleted by either role (deletion is audit-logged)
- Super Admin can set a **cover photo** used in inventory list cards

### 7.4 Low-Stock Alert

A configurable threshold alerts the Super Admin when available car inventory drops low.

| Setting | Default | Configurable |
|---|---|---|
| Low-stock threshold (cars) | 3 vehicles | Yes — in System Settings |
| Alert channel | In-app notification | Yes |
| Alert recipient | Super Admin | Fixed |

When available car count drops to or below the threshold:
- An in-app notification is triggered for the Super Admin
- The Available Cars dashboard card is highlighted with a warning colour
- Alert is logged in the audit log

---

## 8. Sales Registration Module

### 8.1 Register Sold Car

Records the sale of any vehicle in inventory. Links the buyer to the vehicle and updates its status from Available to Sold. Available to both roles.

| Field | Type | Required | Notes / Validation |
|---|---|:---:|---|
| Date Sold | Date | ✅ | Date picker. Defaults to today. Cannot be a future date. |
| Vehicle Sold | Linked Search | ✅ | Search and select from Available inventory. Auto-populates linked fields. |
| Name of Vehicle | Auto-fill | Auto | Auto-populated from selected vehicle record. |
| Chassis Number | Auto-fill | Auto | Auto-populated. Read-only on this form. |
| Engine Number | Auto-fill | Auto | Auto-populated. Read-only on this form. |
| Plate Number | Auto-fill / Text | ❌ | Auto-populated if available. Can be entered here if not set at registration. |
| Colour | Auto-fill | Auto | Auto-populated from inventory record. |
| Name of Buyer | Text | ✅ | Full name of purchaser. Max 150 chars. |
| Buyer's Phone Number | Phone | ✅ | Nigerian format validation (+234 or 0XX). Stored in Customer Database. |
| Address of Buyer | Textarea | ✅ | Full physical address. |
| Name of Witness | Text | ✅ | Full name of transaction witness. |
| Selling Price (₦) | Currency | ✅ | Required for revenue calculation and receipt. Visible to both roles. |
| Mode of Sale | Dropdown | ✅ | Options: Outright Sale, Hire Purchase, Part Payment, Swap + Cash, Auction Sale. |
| Notes / Remarks | Textarea | ❌ | Internal notes. Not printed on receipt. |
| Registered By | Auto | Auto | Auto-filled with logged-in user name and timestamp. |

**Business Rules:**
- Only vehicles with status **Available** can be selected. Sold/Swapped/Archived vehicles are excluded.
- On saving, the vehicle's status is immediately updated to **Sold** and removed from available inventory counts.
- The buyer's name and phone number are automatically added to or matched against the Customer Database.
- A sale record cannot be deleted. Super Admin may flag a record as **Reversed** (with mandatory reason notes), which restores the vehicle to Available — all changes are audit-logged.
- Selling price feeds directly into Revenue module calculations.

---

## 9. Swap Management Module

A swap deal involves a customer exchanging their vehicle with ZEXT, either for another vehicle in inventory or for a vehicle + cash difference. Both sides of the transaction are fully tracked.

### 9.1 Register Swap Deal

| Field | Type | Required | Notes / Validation |
|---|---|:---:|---|
| Date of Swap | Date | ✅ | Date the swap transaction was completed. |
| Outgoing Vehicle | Linked Search | ✅ | Vehicle leaving ZEXT's inventory. Selected from Available stock. |
| Incoming Vehicle Name | Text | ✅ | Name/description of vehicle received from the customer. |
| Incoming Chassis No. | Text | ✅ | VIN of received vehicle. System auto-registers it in inventory. |
| Incoming Engine No. | Text | ✅ | Engine number of received vehicle. |
| Incoming Colour | Text | ✅ | Colour of vehicle received. |
| Incoming Category | Dropdown | ✅ | NG Used, Tokunbo, or Bike — determines inventory categorisation. |
| Customer Name | Text | ✅ | Name of the customer performing the swap. Stored in Customer Database. |
| Customer Phone | Phone | ✅ | Nigerian format validation. |
| Cash Difference (₦) | Currency | ❌ | If the swap involves a cash top-up. Direction: Customer Pays or ZEXT Pays. |
| Mode of Swap | Dropdown | ✅ | Direct Swap (No Cash), Swap + Customer Cash Top-Up, Swap + ZEXT Cash Top-Up. |
| Witness Name | Text | ✅ | Witness to the swap agreement. |
| Notes | Textarea | ❌ | Internal remarks. |

**Business Rules:**
- On saving: the outgoing vehicle status becomes **Swapped** and the incoming vehicle is auto-registered as a new **Available** inventory record.
- Cash top-up amounts received from customers contribute to revenue calculations.
- A swap receipt can be generated showing both vehicle details and any cash difference.

---

## 10. Accessories & Scooter Bikes Module

Tracks stock and sales of car accessories (mats, covers, chargers, polish kits, etc.) and scooter bikes as separate inventory categories from cars.

### 10.1 Accessories / Bikes Inventory Register

| Field | Type | Required | Notes |
|---|---|:---:|---|
| Item Name | Text | ✅ | Name of accessory or bike model. |
| Category | Dropdown | ✅ | Car Accessory, Scooter Bike. |
| Description | Textarea | ❌ | Brand, specifications, compatibility notes. |
| Quantity in Stock | Number | ✅ | Current stock count. Updated automatically on each sale. |
| Unit Cost Price (₦) | Currency | ✅ Admin only | Purchase cost. Hidden from Secretary. |
| Unit Selling Price (₦) | Currency | ✅ | Retail price. Printed on receipts. |
| Item Photos | Image Upload | ❌ | Up to 4 photos per item. |
| Date Added | Date | Auto | Auto-filled on record creation. |
| Low-Stock Threshold | Number | ❌ | Defaults to 2. Alert fires when stock hits this level. |

### 10.2 Stock Quantity Tracking

- Stock quantity is **automatically decremented** on every confirmed sale.
- **Low-stock alert** fires when quantity reaches the configured threshold (default: ≤ 2 units).
- Alert is delivered as an in-app notification to Super Admin and highlighted on the inventory list.
- Super Admin can manually adjust stock count (stock correction) — adjustment is audit-logged with before/after values.

### 10.3 Accessories / Bikes Sale

| Field | Type | Required | Notes |
|---|---|:---:|---|
| Item(s) Sold | Multi-select | ✅ | Select one or more items. System deducts quantity on save. |
| Quantity Sold | Number | ✅ | Per item. Cannot exceed stock on hand. |
| Date Sold | Date | ✅ | Defaults to today. |
| Buyer Name | Text | ✅ | Customer name. |
| Buyer Phone | Phone | ❌ | Optional for accessories. |
| Total Amount (₦) | Auto-calc | Auto | Auto-calculated as sum of (qty × unit price) for all items. |
| Payment Mode | Dropdown | ✅ | Cash, Transfer, POS. |

**Business Rules:**
- Stock quantity is decremented immediately on sale confirmation.
- Accessories and bikes sales are included in the Revenue module as a separate category.
- High-value scooter bikes can optionally have chassis and engine numbers for detailed tracking.
- A dedicated accessories/bike receipt is generated per sale.

---

## 11. Receipt Module

Generates professional, branded sale receipts tied to specific sale or swap records. Receipts cannot be created without an underlying confirmed transaction.

### 11.1 Receipt Types & Templates

| Receipt Type | Trigger | Key Differentiator |
|---|---|---|
| **Nigeria Used Car Receipt** | NG Used vehicle sold | Legal disclaimer for locally-used vehicles |
| **Tokunbo (Foreign Used) Receipt** | Tokunbo vehicle sold | Foreign-used import acknowledgement clause |
| **Swap Deal Receipt** | Swap deal completed | Shows both outgoing and incoming vehicle details + cash difference |
| **Accessories / Bike Receipt** | Accessories or bike sold | Line-item list with quantities and unit prices |

### 11.2 Receipt Number Auto-Generation

Every receipt is assigned a **unique, sequential receipt number** at the point of generation.

**Format:** `ZJV-[YEAR]-[SEQUENCE]`
**Examples:** `ZJV-2025-0001`, `ZJV-2025-0042`, `ZJV-2026-0001`

- Sequence resets at the start of each calendar year
- Numbers cannot be reused, skipped, or manually overridden
- Voided receipts retain their number (displayed with a VOID watermark)

### 11.3 Receipt Selection Flow

1. User clicks **Issue Receipt** from the dashboard or from a specific sale/swap record.
2. If accessed from dashboard, a type-selection screen displays: NG Used Car, Tokunbo, Swap Deal, Accessories/Bike.
3. User searches for and selects the related transaction record (if not pre-linked).
4. System pre-fills all relevant fields from the transaction record.
5. User reviews, makes any permitted edits, and clicks **Generate Receipt**.
6. Receipt is rendered as a printable, branded PDF. User can **Print** or **Download**.

### 11.4 Car Sale Receipt Fields

| Field | Source | Required |
|---|---|:---:|
| Receipt Number | Auto-generated | ✅ |
| Receipt Date | Defaults to sale date | ✅ |
| Receipt Type Label | Auto (from category) | ✅ |
| Name of Buyer | From sale record | ✅ |
| Address of Buyer | From sale record | ✅ |
| Buyer's Phone Number | From sale record | ✅ |
| Vehicle Name | From vehicle record | ✅ |
| Chassis Number | From vehicle record | ✅ |
| Engine Number | From vehicle record | ✅ |
| Colour | From vehicle record | ✅ |
| Plate Number | From vehicle record | ❌ |
| Amount Paid (₦) | From sale record | ✅ |
| Mode of Payment | From sale record | ✅ |
| Name of Witness | From sale record | ✅ |
| Seller Signature Block | ZEXT branding template | ✅ |
| Disclaimer Text | Configurable per template | ✅ |

### 11.5 Receipt Business Rules

- Once a receipt is generated and saved, it becomes **read-only**.
- Super Admin may **void** a receipt (with mandatory reason notes) — voided receipts retain their number and display a VOID watermark.
- All receipts are indexed and searchable by receipt number, buyer name, vehicle name, and date.
- Receipt PDFs include the ZEXT JOINT VENTURES logo, company address, and contact details in the header.
- **Revenue is calculated from receipt data** — only confirmed, non-voided receipts contribute to revenue totals.

---

## 12. Revenue & Financial Controls

Aggregates financial data from all sale records and issued receipts. Accessible only to the **Super Admin** role.

### 12.1 Revenue Dashboard

| Metric | Description |
|---|---|
| **Total Revenue (All Time)** | Sum of all selling prices from confirmed, non-voided receipts |
| **Revenue This Month** | Sum of sales in the current calendar month |
| **Revenue This Year** | Sum of sales in the current calendar year |
| **Revenue by Category** | Separate totals: NG Used Cars, Tokunbo Cars, Swaps (cash top-up), Accessories, Bikes |
| **Number of Sales** | Total transactions contributing to revenue, filterable by period |
| **Average Sale Value** | Total Revenue ÷ Number of Sales for selected period |

### 12.2 Revenue Breakdown by Category

The revenue module provides a dedicated breakdown view:

| Category | What Contributes |
|---|---|
| **NG Used Cars** | Selling price from all NG Used car sales |
| **Tokunbo Cars** | Selling price from all Tokunbo car sales |
| **Swap Deals** | Cash top-up amounts received from customers |
| **Accessories** | Total from all accessories sales |
| **Scooter Bikes** | Total from all scooter bike sales |

### 12.3 Monthly / Yearly Revenue Reports

- **Monthly report:** Revenue per month for the selected year, displayed as a bar chart and data table
- **Yearly report:** Revenue per year since system inception
- **Category report:** Revenue breakdown by category for any selected date range
- **Custom date range:** User-defined from–to date filter across all report types

### 12.4 Report Export

| Export Format | Content |
|---|---|
| **PDF** | Branded report with ZEXT header, charts (where supported), data tables, and date range label |
| **Excel (.xlsx)** | Raw data table with all transaction rows, suitable for further analysis |
| **CSV** | Flat comma-separated export for system import or custom analysis |

**Business Rules:**
- Revenue sourced exclusively from confirmed, non-voided receipts linked to confirmed sale records.
- Swap deals contribute only cash top-up amounts received from customers.
- Cost price (purchase price) is tracked separately — profit margin reporting is a Phase 2 feature.

---

## 13. Customer Database

Automatically built from buyer information captured in sale and swap records. Serves as a CRM foundation for repeat business, communication, and buyer history.

### 13.1 Customer Profile (Auto-Generated)

| Field | Source | Notes |
|---|---|---|
| Customer Name | Sale / Swap record | Captured automatically |
| Phone Number(s) | Sale / Swap record | One or more numbers on file |
| Address | Most recent sale record | Updated on new transactions |
| Transaction History | Linked sale / swap records | All purchases and swaps |
| Total Spent (₦) | Aggregated from sales | **Admin only** |
| Date First Transacted | First sale record | Auto-captured |
| Internal Notes | Manual entry | Free-text notes |

### 13.2 Search & Filter

Both roles can search the Customer Database. Searches are available by:

- **Name** (partial match supported)
- **Phone number** (partial match supported)
- **Vehicle purchased** (search by vehicle name or chassis number)
- **Date range** of first or last transaction

### 13.3 Access Rules

- **Both roles** can view and search customer profiles and transaction history.
- **Secretary** cannot see total amount spent per customer (financial data hidden).
- **Super Admin** has full access including financial totals and the ability to add internal notes or merge duplicate customer records.

---

## 14. Audit Log

Provides a tamper-proof chronological record of all significant system actions. **Both the Super Admin and Secretary can view the full audit log** — including each other's actions.

### 14.1 Logged Events

| Event Category | Specific Actions Logged |
|---|---|
| **Authentication** | Login success/fail, Logout, OTP requested, OTP failed, Account locked, Password changed, Password reset |
| **Vehicle Registration** | New vehicle registered, Vehicle record edited, Vehicle archived |
| **Sales** | Sale record created, Sale record reversed |
| **Swaps** | Swap deal registered, Swap record edited |
| **Receipts** | Receipt generated, Receipt voided, Receipt downloaded/printed |
| **Accessories & Bikes** | Item added to stock, Item sold, Stock count adjusted |
| **Revenue** | Revenue report exported (format, date range, exported by) |
| **Customer Database** | Customer record created, Customer notes edited, Duplicate merged |
| **User Management** | User account created, edited, or disabled (Admin only) |
| **Notifications** | Email notification sent (type, recipient, timestamp) |
| **System** | System settings changed (field, old value → new value) |

### 14.2 Audit Log Entry Fields

| Field | Type | Description |
|---|---|---|
| Timestamp | DateTime | Exact date and time (Nigeria WAT timezone) |
| User | Text | Name and role of the user who performed the action |
| Action | Text | Descriptive label e.g. "Registered new vehicle: Toyota Camry 2019" |
| Record Reference | Link | Linked ID of the affected record |
| IP Address | Text | IP address of the session performing the action |
| Device / Browser | Text | User-agent string captured at login |
| Before / After | JSON Diff | For edit actions: snapshot of what changed (old value → new value) |

### 14.3 Audit Log Filters

Users can filter the audit log by:

| Filter | Options |
|---|---|
| **User** | Select specific user (Super Admin or Secretary name) |
| **Date Range** | Custom from–to date picker |
| **Action Type / Category** | Authentication, Vehicles, Sales, Receipts, Revenue, etc. |
| **Keyword Search** | Free-text search across action descriptions |

### 14.4 Audit Log Export *(Super Admin Only)*

- Export filtered audit log to **PDF** (formatted report) or **CSV** (raw data)
- Export action itself is logged in the audit log
- Exported file includes: export date, exported by, filter criteria applied, and all matching log entries

### 14.5 Audit Log Rules

- The audit log is **append-only** — no record can be edited or deleted by any user, including Super Admin.
- Log entries are retained indefinitely (no automatic purging in v1.0).
- All exports include a generation timestamp and the exporting user's name.

---

## 15. Notifications

### 15.1 In-App Notifications

Both roles receive relevant in-app notifications, displayed in a notification bell/tray:

| Event | Recipient | Trigger |
|---|---|---|
| New vehicle registered by Secretary | Super Admin | On save |
| New sale recorded by Secretary | Super Admin | On save |
| New swap deal recorded by Secretary | Super Admin | On save |
| Account locked (failed logins) | Super Admin | On 5th failure |
| Low-stock alert — cars | Super Admin | When count ≤ threshold |
| Low-stock alert — accessories/bikes | Super Admin | When qty ≤ threshold |
| Receipt voided | Super Admin | On void action |
| Sale reversal recorded | Super Admin | On reversal save |
| Session timeout warning | Active user | At 25 min inactivity |
| New receipt issued | Both roles | When receipt generated |

### 15.2 Email Notifications *(Super Admin Only)*

Email notifications are sent to the Super Admin's registered email address for high-priority events:

| Event | Email Sent |
|---|---|
| Secretary registers a new sale | Yes |
| Secretary registers a new vehicle | Yes |
| Account locked due to failed logins | Yes |
| Sale record reversed | Yes |
| Receipt voided | Yes |

### 15.3 Notification Rules

- In-app notifications are marked as read when viewed; unread count shown on notification bell.
- Super Admin can configure which email notifications are enabled/disabled in System Settings.
- Email notifications use a consistent ZEXT-branded email template.
- All email notifications sent are logged in the audit log (type, recipient, timestamp).

---

## 16. Security Enhancements

### 16.1 Session Security

| Control | Specification |
|---|---|
| **Session Timeout** | Auto-logout after 30 minutes of inactivity |
| **Inactivity Warning** | In-app banner shown at 25 minutes |
| **Concurrent Session Block** | New login invalidates all previous sessions |
| **JWT Token Expiry** | Access token: 30 minutes. Refresh token: 7 days. |
| **Secure Cookie Flags** | HttpOnly, Secure, SameSite=Strict on all auth cookies |

### 16.2 OTP Security

| Control | Specification |
|---|---|
| **OTP Validity Window** | 5–10 minutes (configurable in System Settings, default 10 min) |
| **OTP Retry Limit** | Maximum 3 attempts before OTP is invalidated |
| **OTP Storage** | Hashed before database storage — never stored in plaintext |
| **Resend Rate Limit** | One resend request permitted every 60 seconds |
| **OTP Delivery** | Via registered email only — no SMS fallback in v1.0 |

### 16.3 Failed Login Attempt Lockout

| Control | Specification |
|---|---|
| **Lockout Threshold** | 5 consecutive failed login attempts (step 1 or step 2) |
| **Lockout Duration** | 30 minutes automatic unlock |
| **Admin Override** | Super Admin can manually unlock an account immediately |
| **Notification** | Super Admin notified via email and in-app alert on lockout |
| **Audit Log** | Every failed attempt and lockout event is logged |

### 16.4 Device / IP Logging

Every login — successful or failed — captures and stores:

- **IP address** of the request
- **Browser user-agent** (device type, OS, browser)
- **Timestamp** (WAT timezone)
- **Outcome** (success / failed / locked)

This data is viewable by the Super Admin in the audit log and on the user account detail page (login history).

### 16.5 Additional Security Controls

- All data transmitted over **HTTPS / TLS 1.2+**
- SQL injection protection via **parameterised queries** (Prisma ORM)
- XSS protection via **output encoding** and **Content Security Policy headers**
- **CSRF protection** on all state-changing endpoints
- Role-based access control enforced at both **frontend route level** and **backend API guard level**
- API endpoints return **generic error messages** to clients — detailed errors logged server-side only

---

## 17. Non-Functional Requirements

### 17.1 Performance

| Requirement | Target |
|---|---|
| Dashboard load time | ≤ 2 seconds on standard broadband |
| Inventory search response | ≤ 1 second for up to 10,000 records |
| Receipt PDF generation | ≤ 3 seconds |
| Revenue report generation | ≤ 5 seconds for 12-month report |
| API response time (95th percentile) | ≤ 500ms |

### 17.2 Reliability & Availability

- Target uptime: **99.5% monthly**
- Daily automated database backups with **30-day retention**
- Point-in-time restore capability
- Graceful error handling — no unhandled exceptions exposed to users

### 17.3 Scalability

- System designed to support up to **5 concurrent users** in v1.0 (2-person team + growth buffer)
- Database schema supports future multi-branch expansion via `branch_id` field on records
- File storage abstracted behind a service interface to allow migration from local disk to S3 without code changes

### 17.4 Usability

- Responsive design — fully functional on **desktop and tablet** (1024px+ width)
- All forms include **real-time validation** with clear, field-level error messages
- **Confirmation dialogs** for all irreversible actions (sale reversal, receipt voiding, archiving)
- Language: **English** (Nigerian conventions — phone format, currency ₦, dates DD/MM/YYYY)
- All tables support **pagination** (20 rows per page default, configurable)

---

## 18. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | Next.js 15 (React 19) | SSR + CSR flexibility, App Router, performance |
| **UI Styling** | Tailwind CSS v4 | Utility-first, fast to build, consistent design tokens |
| **State Management** | Zustand v5 | Lightweight, TypeScript-first, minimal boilerplate |
| **Authentication** | next-auth v4 + custom OTP | Credentials provider + custom 2FA flow |
| **Backend Framework** | Node.js + NestJS | Modular, decorator-based, TypeScript throughout |
| **ORM** | Prisma ORM | TypeScript-first, type-safe queries, excellent NestJS integration |
| **Database** | PostgreSQL 15 | Robust relational integrity, JSON support, Prisma-compatible |
| **Auth Strategy** | JWT (access + refresh tokens) via NestJS Passport | Industry standard, stateless, role-claim support |
| **OTP / Email** | Nodemailer + SMTP (Mailgun / SendGrid / Zoho) | Reliable transactional email delivery |
| **PDF Generation** | Puppeteer (server-side headless Chrome) | Full HTML/CSS receipt templates rendered to PDF |
| **Excel Export** | ExcelJS | Server-side .xlsx generation for revenue reports |
| **File Storage** | Local disk (v1) → AWS S3 / Cloudflare R2 (v2) | Vehicle and accessory photo storage |
| **API Documentation** | Swagger / OpenAPI via @nestjs/swagger | Auto-generated from decorators |
| **Validation** | class-validator + class-transformer | Built into NestJS, DTO-level validation |
| **Testing** | Jest + Supertest | Unit, integration, and e2e API tests |
| **Hosting** | VPS / DigitalOcean / AWS Lightsail | Nigeria or nearby region for low latency |
| **Version Control** | Git — GitHub private repository | Branch protection, PR-based workflow |

---

## 19. NestJS Module Architecture

The backend is organised into self-contained NestJS modules. Each module owns its controllers, services, DTOs, and Prisma repository calls.

### 19.1 Module Map

| NestJS Module | Responsibilities |
|---|---|
| **AuthModule** | Login, OTP generation/validation, JWT issuance, refresh tokens, session guards (JwtAuthGuard, RolesGuard) |
| **UsersModule** | User account CRUD, role assignment, password management, login history |
| **VehiclesModule** | Vehicle registration, inventory status management, photo upload, chassis uniqueness, history tracking, low-stock alerts |
| **SalesModule** | Sale record creation, reversal workflow, buyer capture, inventory status update |
| **SwapsModule** | Swap deal registration, dual-vehicle linking, incoming vehicle auto-registration |
| **ReceiptsModule** | Receipt generation, PDF rendering via Puppeteer, auto-numbering (ZJV-YYYY-NNNN), void workflow |
| **RevenueModule** | Aggregation queries, category breakdown, monthly/yearly reports, PDF/Excel/CSV export — Admin-guarded |
| **AccessoriesModule** | Accessories and bike inventory, stock tracking, sale recording, low-stock alerts |
| **CustomersModule** | Auto-build from sale/swap records, transaction history aggregation, directory search |
| **AuditModule** | Append-only log writer (used by all modules via AuditService), log query with filters, PDF/CSV export |
| **NotificationsModule** | In-app notification store, email dispatch via Nodemailer, event-driven triggers (EventEmitter2) |
| **CommonModule** | Shared DTOs, decorators (@Roles, @CurrentUser), interceptors (AuditInterceptor), pipes, response helpers, pagination |

### 19.2 Key NestJS Patterns

| Pattern | Usage in CDMS |
|---|---|
| **Guards** | `JwtAuthGuard` on all protected routes; `RolesGuard` checks `@Roles()` decorator for Admin-only endpoints |
| **Interceptors** | `AuditInterceptor` automatically logs write operations without polluting service logic |
| **Pipes** | `ValidationPipe` globally enabled — DTOs validated via class-validator before reaching controllers |
| **Events** | `EventEmitter2` for decoupled notifications (e.g. `SaleCreatedEvent` triggers `AuditService` + `NotificationsService`) |
| **Swagger** | `@ApiTags`, `@ApiBearerAuth`, `@ApiProperty` on all DTOs — auto-generates interactive API docs at `/api/docs` |
| **Prisma** | Injected as `PrismaService` into each module's service — type-safe database access throughout |

---

## 20. Development Roadmap

### Phase 1 — Core System *(Weeks 1–6)*

- Authentication Module (2FA OTP login, JWT, session management, role-based access)
- Dashboard (Super Admin and Secretary views)
- Vehicle Registration Module
- Basic Inventory List with search and category filter
- Sales Registration Module
- Basic Receipt Generation (NG Used + Tokunbo)
- Audit Log (core logging + basic view)

### Phase 2 — Inventory & Financial Features *(Weeks 7–10)*

- Vehicle History Tracking (lifecycle timeline)
- Vehicle Photos / Image Gallery
- Low-Stock Alerts (cars and accessories)
- Revenue Module (category breakdown, monthly/yearly reports)
- Report Export (PDF, Excel, CSV)
- Swap Management Module
- Accessories & Scooter Bikes Module (inventory + sales + receipt)
- Customer Database (auto-build + search)
- Notifications (in-app + email)

### Phase 3 — Reporting, Audit & Polish *(Weeks 11–14)*

- Audit Log Filters (by user, date range, action type, keyword)
- Audit Log Export (PDF + CSV)
- Advanced Inventory Filters (colour, date range, sort)
- Customer Database advanced search
- System Settings panel (thresholds, disclaimer text, receipt templates, notification toggles)
- Security hardening review
- Performance optimisation and query tuning
- UAT (User Acceptance Testing) with ZEXT team
- Production deployment and go-live

---

## 21. Glossary

| Term | Definition |
|---|---|
| **NG Used / Nigeria Used** | A vehicle previously owned and used within Nigeria before resale. |
| **Tokunbo (Toks)** | A vehicle imported from abroad (Europe, USA, Asia) as a foreign-used car. Nigerian term derived from "Taken from abroad". |
| **Chassis Number** | A unique 17-character Vehicle Identification Number (VIN) assigned by the manufacturer. |
| **Engine Number** | A unique alphanumeric code stamped on the engine block by the manufacturer. |
| **Mode of Purchase** | How ZEXT acquired the vehicle: Outright Purchase, Trade-In, Swap, Auction, or Consignment. |
| **Mode of Sale** | How the buyer is paying: Outright Sale, Hire Purchase, Part Payment, Swap + Cash, Auction Sale. |
| **OTP** | One-Time Password — a time-limited 6-digit code sent to a user's email to verify identity during login. |
| **2FA** | Two-Factor Authentication — requiring two proofs of identity (password + OTP). |
| **JWT** | JSON Web Token — a signed token issued on login, used to authenticate subsequent API requests. |
| **NestJS Guard** | A NestJS construct that determines whether a request is authorised before reaching a controller. |
| **Audit Log** | An immutable, append-only chronological record of all significant actions performed in the system. |
| **Receipt Number** | Auto-generated unique identifier. Format: ZJV-[YEAR]-[SEQUENCE] e.g. ZJV-2025-0042. |
| **WAT** | West Africa Time — UTC+1. The timezone used for all timestamps in the system. |
| **Prisma ORM** | TypeScript-first database ORM used with NestJS for type-safe PostgreSQL queries. |
| **Low-Stock Alert** | A notification triggered when inventory count drops to or below a configured threshold. |
| **Vehicle History** | The full lifecycle trail of a vehicle record: bought → available → sold/swapped/archived. |

---

*End of Document*

---

**ZEXT JOINT VENTURES Nig. LTD — Car Dealership Management System PRD — Version 2.0**
*CONFIDENTIAL — For internal use and development team only*
