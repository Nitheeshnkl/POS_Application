# Sri Murugan Store POS System

> A modern Point of Sale (POS) system built for small retail stores to simplify billing, inventory management, sales tracking, and business analytics.

## Overview

Sri Murugan Store POS is a full-stack web application developed for grocery and retail shops. It helps store owners and cashiers manage daily operations through a fast, user-friendly interface.

The system supports secure authentication, barcode-based billing, inventory tracking, purchase management, cash drawer reconciliation, sales reports, and business insights—all from a single dashboard.

This project was designed with real-world retail workflows in mind and focuses on simplicity, speed, and reliability.

---

<img width="1470" height="836" alt="Screenshot 2026-07-07 at 11 27 06 PM" src="https://github.com/user-attachments/assets/ed9655d4-bef0-4470-b9cc-be07db1497b6" />

## Key Features

### Authentication & Authorization

* Secure JWT authentication
* HTTP-only refresh token cookies
* Role-based access control
* Separate Owner and Cashier dashboards

---

### Billing System

<img width="1468" height="837" alt="Screenshot 2026-07-07 at 11 28 14 PM" src="https://github.com/user-attachments/assets/1d2fcc34-7512-4300-8109-8856cc33c229" />

* Fast product search
* Barcode scanning support
* Multiple payment methods

  * Cash
  * UPI / GPay
  * Mixed Payments
* Automatic bill calculation
* Printable receipts
* Instant stock deduction after every sale

---

### Product Management

* Add products
* Edit product details
* Delete products
* Barcode management
* English & Tamil product names
* Category management
* Purchase and selling price tracking
* Minimum stock alerts

### Stock Management

* Edit available stock directly
* Automatic stock movement history
* Out of Stock indicators
* Low Stock warnings
* Live inventory updates without refreshing

---

### Purchase Management

* Record supplier purchases
* Update inventory automatically
* Maintain purchase history

---

### Cash Drawer

* Daily cash summary
* Cash reconciliation
* Cash-out functionality
* Cash-out history
* System vs Actual cash comparison

---

### Business Analytics Dashboard

The dashboard provides useful business insights such as:

* Monthly sales target
* Daily sales target
* Remaining sales required
* Current month sales
* Sales progress
* Expected month-end sales
* Sales projections
* Inventory status
* Gross profit
* Net profit
* Operating expenses
* Sales per hour
* Inventory value

---

### Reports

* Daily sales
* Monthly sales
* Product-wise sales
* Inventory reports
* Cash reports

---

### Requested Products

Cashiers can submit customer product requests when an item is unavailable.

Owners can review these requests later and decide whether to purchase the requested products.

---

### Multi-language Support

* English
* Tamil

Users can switch languages instantly without reloading the application.

---

## Technologies Used

### Frontend

* React
* TypeScript
* Vite
* React Query
* Axios
* Tailwind CSS
* React Router

### Backend

* Node.js
* Express.js
* TypeScript
* PostgreSQL
* JWT Authentication
* bcrypt
* Helmet
* CORS

### Database

* PostgreSQL

### Deployment

* Frontend: Vercel
* Backend: Render
* Database: Render PostgreSQL

---

## Project Structure

```text
POS_Application
│
├── backend
│   ├── controllers
│   ├── routes
│   ├── services
│   ├── middleware
│   ├── database
│   └── config
│
├── pos-frontend
│   ├── components
│   ├── pages
│   ├── api
│   ├── store
│   ├── hooks
│   └── utils
│
└── DEPLOYMENT_GUIDE.md
```

---

## User Roles

### Owner

The owner has complete access to the system.

Features include:

* Dashboard
* Product Management
* Purchase Management
* Sales Reports
* Cash Drawer
* Cash-out History
* Inventory Monitoring
* Business Analytics
* Settings
* Requested Products

---

### Cashier

The cashier focuses on billing operations.

Features include:

* Product Billing
* Barcode Scanning
* Receipt Printing
* Customer Product Requests

---

## Security Features

* JWT Authentication
* Secure HTTP-only Cookies
* Role-based Authorization
* Password Hashing using bcrypt
* Environment Variables for Secrets
* CORS Protection
* Helmet Security Middleware

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Nitheeshnkl/POS_Application.git

cd POS_Application
```

---

### Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file:

```env
DATABASE_URL=your_database_url

JWT_ACCESS_SECRET=your_secret

JWT_REFRESH_SECRET=your_secret

NODE_ENV=development

PORT=3001
```

Run the backend:

```bash
npm run migrate

npm run seed

npm run dev
```

---

### Frontend Setup

```bash
cd pos-frontend

npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3001/api/v1
```

Run the frontend:

```bash
npm run dev
```

---

## Default Login

### Owner

```
Username : admin

Password : Admin@123
```

### Cashier

```
Username : cashier1

Password : Cashier@123
```

---

## Screenshots

> Add your screenshots here.

### Login Page

![Login Screenshot](screenshots/login.png)

---

### Dashboard

![Dashboard Screenshot](screenshots/dashboard.png)

---

### Future Improvements

* Supplier Management
* GST Invoice Support
* Customer Loyalty Program
* SMS / WhatsApp Receipt Sharing
* Sales Forecast using AI
* Cloud Backup
* Mobile Application
* Offline Billing Support

---

## Why This Project?

Many small retail stores still rely on manual billing and handwritten records, making inventory management and sales tracking difficult.

This project was developed to provide a practical, affordable, and easy-to-use solution that helps store owners manage their daily business efficiently while giving them meaningful insights to make better business decisions.

---

## Author

**Nitheesh V**

Electronics and Communication Engineering

Java Full Stack Developer

GitHub: [https://github.com/Nitheeshnkl](https://github.com/Nitheeshnkl)

LinkedIn: https://www.linkedin.com/in/nitheesh-vellaiyan-996159256

Portfolio : https://nitheeshcodes.netlify.app

---

## License

This project is intended for educational and portfolio purposes.

---

# ⭐ If you found this project useful, consider giving it a star on GitHub!

