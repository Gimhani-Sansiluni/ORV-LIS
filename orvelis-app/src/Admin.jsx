import "./Admin.css";
import { useState } from "react";
import { supabase } from "./supabaseClient";
function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  // ORDER STATES
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [orderEmailMessage, setOrderEmailMessage] = useState("");
const [orderEmailError, setOrderEmailError] = useState("");
  // PRODUCT STATES
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productMessage, setProductMessage] = useState("");
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  // CUSTOMER STATES
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerKey, setSelectedCustomerKey] = useState(null);
  const [reportPeriod, setReportPeriod] = useState("this-month");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const emptyProduct = {
    name: "",
    image: "",
    description: "",
    availability: "AVAILABLE",
    price3ml: "",
    price5ml: "",
    price10ml: "",
    price20ml: "",
  };
  const [productForm, setProductForm] = useState(emptyProduct);
  // FETCH CUSTOMER ORDERS
  const fetchOrders = async () => {
    setOrdersLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrdersLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOrders(data || []);
  };
  // UPDATE ORDER STATUS AND SEND CUSTOMER EMAIL
  const handleStatusChange = async (orderId, newStatus) => {
    const currentOrder = orders.find(
      (order) => order.id === orderId
    );
    if (!currentOrder) return;
    const previousStatus = String(
      currentOrder.status || "Pending"
    ).toLowerCase();
    const requestedStatus = String(newStatus).toLowerCase();
    // Do not update or send another email if status is unchanged.
    if (previousStatus === requestedStatus) return;
    setUpdatingOrderId(orderId);
    setError("");
    setOrderEmailMessage("");
    setOrderEmailError("");
    // FIRST: UPDATE THE ORDER IN SUPABASE
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (updateError) {
      setError("Unable to update order status: " + updateError.message);
      setUpdatingOrderId(null);
      return;
    }
    // UPDATE THE ADMIN PANEL
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus }
          : order
      )
    );
    // PENDING DOES NOT REQUIRE AN EMAIL.
    const emailStatuses = [
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!emailStatuses.includes(requestedStatus)) {
      setUpdatingOrderId(null);
      return;
    }
    // SECOND: SEND CUSTOMER EMAIL THROUGH SUPABASE EDGE FUNCTION
    const { data: emailData, error: emailError } =
      await supabase.functions.invoke(
        "send-order-status-email",
        {
          body: {
            orderId,
            newStatus: requestedStatus,
          },
        }
      );
    if (emailError) {
      setOrderEmailError(
        "Order status updated, but the customer email could not be sent: " +
        emailError.message
      );
      setUpdatingOrderId(null);
      return;
    }
    if (!emailData?.success) {
      setOrderEmailError(
        "Order status updated, but email delivery failed: " +
        (emailData?.message || "Unknown email error.")
      );
      setUpdatingOrderId(null);
      return;
    }
    setOrderEmailMessage(
      `Order status updated successfully. Notification email sent to ${currentOrder.customer_email || "the customer"}.`
    );
    setUpdatingOrderId(null);
  };
  // FETCH PRODUCTS
  const fetchProducts = async () => {
    setProductsLoading(true);
    setError("");
    setProductMessage("");
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true });
    setProductsLoading(false);
    if (error) {
      setError("Unable to load products: " + error.message);
      return;
    }
    setProducts(data || []);
  };
  // HANDLE PRODUCT FORM INPUTS
  const handleProductInput = (event) => {
    const { name, value } = event.target;
    setProductForm((current) => ({
      ...current,
      [name]: value,
    }));
  };
  // HANDLE PRODUCT IMAGE SELECTION
  const handleProductImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must not exceed 5MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setProductImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductImagePreview(reader.result);
    };
    reader.onerror = () => {
      setError("Unable to preview the selected image.");
      setProductImageFile(null);
      setProductImagePreview("");
    };
    reader.readAsDataURL(file);
  };
  // RESET PRODUCT FORM
  const resetProductForm = () => {
    setProductForm(emptyProduct);
    setEditingProductId(null);
    setProductMessage("");
    setProductImageFile(null);
    setProductImagePreview("");
    const imageInput = document.getElementById("product-image-upload");
    if (imageInput) {
      imageInput.value = "";
    }
  };
  // EDIT EXISTING PRODUCT
  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      image: product.image || "",
      description: product.description || "",
      availability: product.availability || "AVAILABLE",
      price3ml: product.prices?.["3ml"] ?? "",
      price5ml: product.prices?.["5ml"] ?? "",
      price10ml: product.prices?.["10ml"] ?? "",
      price20ml: product.prices?.["20ml"] ?? "",
    });
    setProductImageFile(null);
    setProductImagePreview(product.image || "");
    const imageInput = document.getElementById("product-image-upload");
    if (imageInput) {
      imageInput.value = "";
    }
    setProductMessage("");
    document.getElementById("product-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };
  // ADD OR UPDATE PRODUCT
  const handleProductSubmit = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setError("");
    setProductMessage("");
    const prices = {
      "3ml": Number(productForm.price3ml),
      "5ml": Number(productForm.price5ml),
      "10ml": Number(productForm.price10ml),
      "20ml": Number(productForm.price20ml),
    };
    const invalidPrices = Object.values(prices).some(
      (price) => !Number.isFinite(price) || price <= 0
    );
    if (invalidPrices) {
      setError("Please enter a valid price for all four sizes.");
      setSavingProduct(false);
      return;
    }
    // CHECK PRODUCT IMAGE
    if (!productImageFile && !productForm.image.trim()) {
      setError("Please upload a perfume image.");
      setSavingProduct(false);
      return;
    }
    // UPLOAD IMAGE TO SUPABASE STORAGE
    let imageUrl = productForm.image || "";
    if (productImageFile) {
      const extension = productImageFile.type === "image/jpeg"
        ? "jpg"
        : productImageFile.type.split("/")[1];
      const safeName = productImageFile.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 50) || "perfume";
      const filePath = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${safeName}.${extension}`;
      const { error: imageUploadError } = await supabase.storage
        .from("Orvelis Products")
        .upload(filePath, productImageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: productImageFile.type,
        });
      if (imageUploadError) {
        setError("Unable to upload image: " + imageUploadError.message);
        setSavingProduct(false);
        return;
      }
      const { data: imageData } = supabase.storage
        .from("Orvelis Products")
        .getPublicUrl(filePath);
      imageUrl = imageData.publicUrl;
    }
    const productData = {
      name: productForm.name.trim(),
      image: imageUrl.trim(),
      description: productForm.description.trim() || null,
      availability: productForm.availability,
      prices,
      updated_at: new Date().toISOString(),
    };
    let result;
    if (editingProductId) {
      result = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProductId);
    } else {
      result = await supabase
        .from("products")
        .insert([
          {
            ...productData,
            display_order: products.length + 1,
          },
        ]);
    }
    setSavingProduct(false);
    if (result.error) {
      setError("Unable to save product: " + result.error.message);
      return;
    }
    setProductMessage(
      editingProductId
        ? "Product updated successfully."
        : "New product added successfully."
    );
    resetProductForm();
    await fetchProducts();
  };
  // DELETE PRODUCT
  const handleDeleteProduct = async (productId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this perfume?"
    );
    if (!confirmed) return;
    setDeletingProductId(productId);
    setError("");
    setProductMessage("");
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    setDeletingProductId(null);
    if (error) {
      setError("Unable to delete product: " + error.message);
      return;
    }
    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== productId)
    );
    if (editingProductId === productId) {
      resetProductForm();
    }
    setProductMessage("Product deleted successfully.");
  };
  // ADMIN LOGIN
  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setLoggedIn(true);
    await Promise.all([
      fetchOrders(),
      fetchProducts(),
    ]);
  };
  // FORGOT PASSWORD
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your admin email address first.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/admin`,
      }
    );
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setError(
        "Password recovery email requested. Please check your inbox and Spam folder."
      );
    }
  };
  // ADMIN LOGOUT
  const handleLogout = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setLoggedIn(false);
    setEmail("");
    setPassword("");
    setOrders([]);
    setProducts([]);
    setCustomerSearch("");
    setSelectedCustomerKey(null);
    resetProductForm();
  };
  // FORMAT CURRENCY
  const formatCurrency = (amount) => {
    return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) return "Date unavailable";
    return new Date(date).toLocaleString("en-LK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };
  // DASHBOARD CALCULATIONS
  const totalOrders = orders.length;

  const countOrdersByStatus = (status) =>
    orders.filter(
      (order) =>
        String(order.status || "pending").trim().toLowerCase() === status
    ).length;

  const pendingOrders = countOrdersByStatus("pending");
  const processingOrders = countOrdersByStatus("processing");
  const shippedOrders = countOrdersByStatus("shipped");
  const deliveredOrders = countOrdersByStatus("delivered");

  const totalRevenue = orders.reduce(
    (total, order) => total + Number(order.total || 0),
    0
  );

  // FORMAT ORDER ITEMS
  const getOrderItems = (items) => {
    if (!items) return "No items";
    if (!Array.isArray(items)) {
      return typeof items === "string"
        ? items
        : JSON.stringify(items);
    }
    return items.map((item) => {
      const name =
        item.name ||
        item.product_name ||
        item.product ||
        item.title ||
        "Product";
      const quantity = item.quantity || item.qty || 1;
      return `${name} × ${quantity}`;
    }).join(", ");
  };
  // BUILD CUSTOMER LIST FROM ORDERS
  // Group customers by email first, then phone, then name.
  const sortedOrdersForCustomers = [...orders].sort(
    (a, b) =>
      new Date(b.created_at || 0) -
      new Date(a.created_at || 0)
  );
  const customerMap = sortedOrdersForCustomers.reduce(
    (groups, order) => {
      const phoneValue = String(order.customer_phone || "").trim();
      const phone = phoneValue.replace(/\D/g, "");
      const emailValue = String(order.customer_email || "").trim();
      const customerEmail = emailValue.toLowerCase();
      const customerName = String(order.customer_name || "").trim();
      const normalizedName = customerName.toLowerCase();
      // EMAIL IS THE PRIMARY CUSTOMER IDENTIFIER.
      // Use phone or name only when email is unavailable.
      const customerKey = customerEmail
        ? `email:${customerEmail}`
        : phone
          ? `phone:${phone}`
          : normalizedName
            ? `name:${normalizedName}`
            : `order:${order.id}`;
      if (!groups[customerKey]) {
        groups[customerKey] = {
          key: customerKey,
          name: customerName || "Customer",
          phone: phoneValue,
          email: emailValue,
          address: order.delivery_address || "",
          district: order.district || "",
          orderCount: 0,
          totalOrderValue: 0,
          orders: [],
          lastOrderDate: order.created_at || null,
        };
      }
      const customer = groups[customerKey];
      // Keep the newest available customer information.
      // Orders are sorted newest first, so don't overwrite
      // details with older order information.
      if ((!customer.name || customer.name === "Customer") && customerName) {
        customer.name = customerName;
      }
      if (!customer.phone && phoneValue) {
        customer.phone = phoneValue;
      }
      if (!customer.email && emailValue) {
        customer.email = emailValue;
      }
      if (!customer.address && order.delivery_address) {
        customer.address = order.delivery_address;
      }
      if (!customer.district && order.district) {
        customer.district = order.district;
      }
      customer.orderCount += 1;
      customer.totalOrderValue += Number(order.total || 0);
      customer.orders.push(order);
      return groups;
    },
    {}
  );
  const customers = Object.values(customerMap).sort(
    (a, b) =>
      new Date(b.lastOrderDate || 0) -
      new Date(a.lastOrderDate || 0)
  );
  // SEARCH CUSTOMERS
  const filteredCustomers = customers.filter((customer) => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search)
    );
  });
  // SELECTED CUSTOMER
  const selectedCustomer = customers.find(
    (customer) => customer.key === selectedCustomerKey
  );
  // REPORT DATE FILTERING
  const reportDateRange = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (reportPeriod === "all-time") {
      return { start: null, end: null, valid: true };
    }
    if (reportPeriod === "today") {
      return { start, end, valid: true };
    }
    if (reportPeriod === "this-week") {
      const day = start.getDay();
      const daysSinceMonday = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - daysSinceMonday);
      return { start, end, valid: true };
    }
    if (reportPeriod === "this-month") {
      start.setDate(1);
      return { start, end, valid: true };
    }
    if (reportPeriod === "custom") {
      if (!reportStartDate || !reportEndDate) {
        return { start: null, end: null, valid: false };
      }
      const customStart = new Date(`${reportStartDate}T00:00:00`);
      const customEnd = new Date(`${reportEndDate}T23:59:59.999`);
      if (
        Number.isNaN(customStart.getTime()) ||
        Number.isNaN(customEnd.getTime()) ||
        customStart > customEnd
      ) {
        return { start: null, end: null, valid: false };
      }
      return {
        start: customStart,
        end: customEnd,
        valid: true,
      };
    }
    return { start, end, valid: true };
  })();
  // ORDERS WITHIN THE SELECTED REPORT PERIOD
  const reportOrders = orders.filter((order) => {
    if (!reportDateRange.valid) return false;
    const orderDate = new Date(order.created_at);
    if (Number.isNaN(orderDate.getTime())) return false;
    if (
      reportDateRange.start &&
      orderDate < reportDateRange.start
    ) {
      return false;
    }
    if (
      reportDateRange.end &&
      orderDate > reportDateRange.end
    ) {
      return false;
    }
    return true;
  });
  // EXCLUDE CANCELLED ORDERS FROM SALES CALCULATIONS
  const reportSalesOrders = reportOrders.filter(
    (order) => (order.status || "").toLowerCase() !== "cancelled"
  );
  // SALES REPORT CALCULATIONS
  const reportTotalOrders = reportSalesOrders.length;
  const reportCancelledOrders = reportOrders.filter(
    (order) => (order.status || "").toLowerCase() === "cancelled"
  ).length;
  const reportSalesTotal = reportSalesOrders.reduce(
    (total, order) => total + Number(order.total || 0),
    0
  );
  const reportAverageOrderValue =
    reportTotalOrders > 0
      ? reportSalesTotal / reportTotalOrders
      : 0;
  // GET PRODUCT ITEMS FOR REPORTS
  const getReportOrderItems = (items) => {
    if (Array.isArray(items)) {
      return items;
    }
    if (typeof items === "string") {
      try {
        const parsedItems = JSON.parse(items);
        return Array.isArray(parsedItems) ? parsedItems : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  // PRODUCT SALES REPORT
  const reportProductMap = reportSalesOrders.reduce(
    (groups, order) => {
      const items = getReportOrderItems(order.order_items);
      items.forEach((item) => {
        const productName = String(
          item.name ||
          item.product_name ||
          item.product ||
          item.title ||
          "Unknown Product"
        ).trim();
        const productKey = productName.toLowerCase();
        const quantityValue = Number(
          item.quantity ?? item.qty ?? 1
        );
        const quantity =
          Number.isFinite(quantityValue) && quantityValue > 0
            ? quantityValue
            : 1;
        if (!groups[productKey]) {
          groups[productKey] = {
            name: productName,
            quantitySold: 0,
            orderIds: new Set(),
          };
        }
        groups[productKey].quantitySold += quantity;
        groups[productKey].orderIds.add(order.id);
      });
      return groups;
    },
    {}
  );
  const reportProducts = Object.values(reportProductMap)
    .map(({ orderIds, ...product }) => ({
      ...product,
      orderCount: orderIds.size,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold);
  // CUSTOMER SPENDING REPORT
  const reportOrdersNewestFirst = [...reportSalesOrders].sort(
    (a, b) =>
      new Date(b.created_at || 0) -
      new Date(a.created_at || 0)
  );
  const reportCustomerMap = reportOrdersNewestFirst.reduce(
    (groups, order) => {
      const customerEmail = String(
        order.customer_email || ""
      ).trim().toLowerCase();
      const phoneValue = String(
        order.customer_phone || ""
      ).trim();
      const phone = phoneValue.replace(/\D/g, "");
      const customerName = String(
        order.customer_name || ""
      ).trim();
      const normalizedName = customerName.toLowerCase();
      // EMAIL FIRST, THEN PHONE, THEN NAME.
      const customerKey = customerEmail
        ? `email:${customerEmail}`
        : phone
          ? `phone:${phone}`
          : normalizedName
            ? `name:${normalizedName}`
            : `order:${order.id}`;
      if (!groups[customerKey]) {
        groups[customerKey] = {
          key: customerKey,
          name: customerName || "Customer",
          email: customerEmail,
          phone: phoneValue,
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: order.created_at || null,
        };
      }
      const customer = groups[customerKey];
      if (
        (!customer.name || customer.name === "Customer") &&
        customerName
      ) {
        customer.name = customerName;
      }
      if (!customer.email && customerEmail) {
        customer.email = customerEmail;
      }
      if (!customer.phone && phoneValue) {
        customer.phone = phoneValue;
      }
      customer.orderCount += 1;
      customer.totalSpent += Number(order.total || 0);
      return groups;
    },
    {}
  );
  const reportCustomers = Object.values(reportCustomerMap).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );
  // EXPORT COMPLETE BUSINESS REPORT AS CSV
  const handleExportReportsCSV = () => {
    const csvRows = [];
    const addRow = (...values) => {
      csvRows.push(values);
    };
    const periodLabels = {
      today: "Today",
      "this-week": "This Week",
      "this-month": "This Month",
      "all-time": "All Time",
      custom: "Custom Date Range",
    };
    addRow("ORVELIS BUSINESS REPORT");
    addRow("Report Period", periodLabels[reportPeriod] || "Selected Period");
    addRow("Generated At", new Date().toLocaleString("en-LK"));
    addRow();
    // SALES SUMMARY
    addRow("SALES SUMMARY");
    addRow("Metric", "Value");
    addRow("Total Orders", reportTotalOrders);
    addRow("Cancelled Orders", reportCancelledOrders);
    addRow("Total Sales (LKR)", reportSalesTotal.toFixed(2));
    addRow("Average Order Value (LKR)", reportAverageOrderValue.toFixed(2));
    addRow();
    // PRODUCT REPORT
    addRow("PRODUCT PERFORMANCE");
    addRow("Perfume", "Quantity Sold", "Number of Orders");
    reportProducts.forEach((product) => {
      addRow(
        product.name,
        product.quantitySold,
        product.orderCount
      );
    });
    addRow();
    // CUSTOMER REPORT
    addRow("CUSTOMER REPORT");
    addRow(
      "Customer",
      "Email",
      "Phone",
      "Orders",
      "Total Spent (LKR)"
    );
    reportCustomers.forEach((customer) => {
      addRow(
        customer.name,
        customer.email,
        customer.phone,
        customer.orderCount,
        customer.totalSpent.toFixed(2)
      );
    });
    // PREPARE CSV CONTENT
    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvContent =
      "\uFEFF" +
      csvRows
        .map((row) => row.map(escapeCSV).join(","))
        .join("\r\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ORVELIS-Business-Report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // ADMIN LOGIN PAGE
  if (!loggedIn) {
    return (
      <div className="admin-login">
        <div className="admin-login-brand">
          <h1>ORVÈLIS</h1>
          <p>PRIVATE ADMINISTRATION</p>
        </div>
        <form onSubmit={handleLogin} className="admin-login-form">
          <h2>ADMIN LOGIN</h2>
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter admin email"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            required
          />
          {error && (
            <p className="admin-login-error">{error}</p>
          )}
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="admin-forgot-button"
          >
            FORGOT PASSWORD?
          </button>
          <button
            type="submit"
            disabled={loading}
            className="admin-login-button"
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    );
  }
  // ADMIN DASHBOARD
  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h1>ORVÈLIS</h1>
          <p>ADMINISTRATION</p>
        </div>
        <nav className="admin-nav">
          <a href="#overview" className="active">
            ◈ &nbsp; Dashboard
          </a>
          <a href="#orders">
            ◷ &nbsp; Orders
          </a>
          <a href="#products">
            ◇ &nbsp; Products
          </a>
          <a href="#customers">
            ♙ &nbsp; Customers
          </a>
          <a href="#reports">
            ▤ &nbsp; Reports
          </a>
        </nav>
        <div className="admin-sidebar-footer">
          <p>ORVÈLIS PRIVATE ACCESS</p>
          <button
            type="button"
            className="admin-button admin-logout"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? "PLEASE WAIT..." : "LOG OUT"}
          </button>
        </div>
      </aside>
      {/* MAIN CONTENT */}
      <main className="admin-main">
        {/* HEADER */}
        <header className="admin-topbar">
          <div>
            <h1 className="admin-page-title">
              Dashboard
            </h1>
            <p className="admin-page-subtitle">
              Welcome back, Administrator.
            </p>
          </div>
          <button
            type="button"
            className="admin-button"
            onClick={() => {
              fetchOrders();
              fetchProducts();
            }}
            disabled={ordersLoading || productsLoading}
          >
            {ordersLoading || productsLoading
              ? "REFRESHING..."
              : "↻ REFRESH DATA"}
          </button>
        </header>
        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}
        {/* OVERVIEW */}
        <section id="overview" className="admin-section">
          <h2 className="admin-section-heading">
            BUSINESS OVERVIEW
          </h2>
          <div className="admin-stats">
            <div className="admin-stat-card">
              <p className="admin-stat-label">TOTAL ORDERS</p>
              <h2 className="admin-stat-value">{totalOrders}</h2>
            </div>

            <div className="admin-stat-card">
              <p className="admin-stat-label">PENDING ORDERS</p>
              <h2 className="admin-stat-value">{pendingOrders}</h2>
            </div>

            <div className="admin-stat-card">
              <p className="admin-stat-label">PROCESSING ORDERS</p>
              <h2 className="admin-stat-value">{processingOrders}</h2>
            </div>

            <div className="admin-stat-card">
              <p className="admin-stat-label">SHIPPED ORDERS</p>
              <h2 className="admin-stat-value">{shippedOrders}</h2>
            </div>

            <div className="admin-stat-card">
              <p className="admin-stat-label">DELIVERED ORDERS</p>
              <h2 className="admin-stat-value">{deliveredOrders}</h2>
            </div>

            <div className="admin-stat-card">
              <p className="admin-stat-label">TOTAL REVENUE</p>
              <h2 className="admin-stat-value">{formatCurrency(totalRevenue)}</h2>
            </div>
          </div>
        </section>
        {/* ORDER MANAGEMENT */}
        <section id="orders" className="admin-section">
          <h2 className="admin-section-heading">
            RECENT CUSTOMER ORDERS
          </h2>
          {orderEmailMessage && (
  <div className="admin-product-message">
    {orderEmailMessage}
  </div>
)}
{orderEmailError && (
  <div className="admin-error">
    {orderEmailError}
  </div>
)}
          {ordersLoading ? (
            <div className="admin-empty">
              Loading customer orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="admin-empty">
              No customer orders found.
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ORDER ID</th>
                    <th>CUSTOMER</th>
                    <th>ORDER ITEMS</th>
                    <th>DATE</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        #{String(order.id).slice(0, 8)}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px",
                            minWidth: "160px",
                          }}
                        >
                          <strong>
                            {order.customer_name || "Not provided"}
                          </strong>

                          <span style={{
                            color: "#A99570",
                            fontSize: "10px",
                            lineHeight: "1.5",
                          }}>
                            {order.customer_phone || "No phone"}
                          </span>

                          <span style={{
                            color: "#D6B878",
                            fontSize: "10px",
                            lineHeight: "1.5",
                            overflowWrap: "anywhere",
                          }}>
                            {order.customer_email || "No email"}
                          </span>
                        </div>
                      </td>
                      <td style={{
                        maxWidth: "220px",
                        lineHeight: "1.8"
                      }}>
                        {getOrderItems(order.order_items)}
                      </td>
                      <td>
                        {formatDate(order.created_at)}
                      </td>
                      <td>
                        {formatCurrency(order.total)}
                      </td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={order.status || "Pending"}
                          onChange={(event) =>
                            handleStatusChange(order.id, event.target.value)
                          }
                          disabled={updatingOrderId === order.id}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        {updatingOrderId === order.id && (
                          <small className="admin-updating-text">
                            Saving...
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* PRODUCT MANAGEMENT */}
        <section id="products" className="admin-section">
          <h2 className="admin-section-heading">
            PRODUCT MANAGEMENT
          </h2>
          <div className="admin-product-form-wrapper" id="product-form">
            <h3 className="admin-product-form-title">
              {editingProductId ? "EDIT PERFUME" : "ADD NEW PERFUME"}
            </h3>
            <form onSubmit={handleProductSubmit} className="admin-product-form">
              <label>Perfume Name</label>
              <input
                type="text"
                name="name"
                value={productForm.name}
                onChange={handleProductInput}
                placeholder="Enter perfume name"
                required
              />
              <label>Upload Perfume Image</label>
              <input
                id="product-image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProductImageChange}
              />
              <p style={{
                color: "#A99570",
                fontSize: "10px",
                marginTop: "8px",
              }}>
                JPG, PNG or WEBP · Maximum 5MB
              </p>
              {productImagePreview && (
                <div style={{
                  marginTop: "15px",
                  marginBottom: "20px",
                }}>
                  <img
                    src={productImagePreview}
                    alt="Perfume preview"
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "contain",
                      background: "#FFFFFF",
                      padding: "8px",
                      border: "1px solid #665538",
                    }}
                  />
                  {productImageFile && (
                    <button
                      type="button"
                      className="admin-product-cancel"
                      style={{ display: "block", marginTop: "10px" }}
                      onClick={() => {
                        setProductImageFile(null);
                        setProductImagePreview(productForm.image || "");
                        const imageInput = document.getElementById(
                          "product-image-upload"
                        );
                        if (imageInput) {
                          imageInput.value = "";
                        }
                      }}
                    >
                      CLEAR SELECTED IMAGE
                    </button>
                  )}
                </div>
              )}
              <label>Description (Optional)</label>
              <textarea
                name="description"
                value={productForm.description}
                onChange={handleProductInput}
                placeholder="Enter perfume description"
                rows="3"
              />
              <label>Availability</label>
              <select
                name="availability"
                value={productForm.availability}
                onChange={handleProductInput}
              >
                <option value="AVAILABLE">Available</option>
                <option value="SOLD OUT">Sold Out</option>
              </select>
              <h4 className="admin-product-prices-heading">
                PERFUME PRICES (LKR)
              </h4>
              <div className="admin-product-price-grid">
                <div>
                  <label>3ml Price</label>
                  <input
                    type="number"
                    name="price3ml"
                    value={productForm.price3ml}
                    onChange={handleProductInput}
                    placeholder="3ml"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label>5ml Price</label>
                  <input
                    type="number"
                    name="price5ml"
                    value={productForm.price5ml}
                    onChange={handleProductInput}
                    placeholder="5ml"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label>10ml Price</label>
                  <input
                    type="number"
                    name="price10ml"
                    value={productForm.price10ml}
                    onChange={handleProductInput}
                    placeholder="10ml"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label>20ml Price</label>
                  <input
                    type="number"
                    name="price20ml"
                    value={productForm.price20ml}
                    onChange={handleProductInput}
                    placeholder="20ml"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="admin-product-form-actions">
                <button
                  type="submit"
                  className="admin-button admin-product-save"
                  disabled={savingProduct}
                >
                  {savingProduct
                    ? "SAVING..."
                    : editingProductId
                      ? "UPDATE PERFUME"
                      : "ADD PERFUME"}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    className="admin-button admin-product-cancel"
                    onClick={resetProductForm}
                    disabled={savingProduct}
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </form>
          </div>
          {productMessage && (
            <div className="admin-product-message">
              {productMessage}
            </div>
          )}
          <h3 className="admin-product-list-title">
            YOUR PERFUME COLLECTION
          </h3>
          {productsLoading ? (
            <div className="admin-empty">
              Loading perfumes...
            </div>
          ) : products.length === 0 ? (
            <div className="admin-empty">
              No perfumes found.
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>PERFUME</th>
                    <th>3ML</th>
                    <th>5ML</th>
                    <th>10ML</th>
                    <th>20ML</th>
                    <th>AVAILABILITY</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                      </td>
                      <td>
                        {formatCurrency(product.prices?.["3ml"])}
                      </td>
                      <td>
                        {formatCurrency(product.prices?.["5ml"])}
                      </td>
                      <td>
                        {formatCurrency(product.prices?.["10ml"])}
                      </td>
                      <td>
                        {formatCurrency(product.prices?.["20ml"])}
                      </td>
                      <td>
                        <span className="admin-product-availability">
                          {product.availability || "AVAILABLE"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-product-actions">
                          <button
                            type="button"
                            className="admin-product-edit"
                            onClick={() => handleEditProduct(product)}
                          >
                            EDIT
                          </button>
                          <button
                            type="button"
                            className="admin-product-delete"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deletingProductId === product.id}
                          >
                            {deletingProductId === product.id
                              ? "DELETING..."
                              : "DELETE"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* CUSTOMER MANAGEMENT */}
        <section id="customers" className="admin-section">
          <h2 className="admin-section-heading">
            CUSTOMER MANAGEMENT
          </h2>
          {/* CUSTOMER STATISTICS */}
          <div className="admin-stats">
            <div className="admin-stat-card">
              <p className="admin-stat-label">
                TOTAL CUSTOMERS
              </p>
              <h2 className="admin-stat-value">
                {customers.length}
              </h2>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">
                TOTAL CUSTOMER ORDERS
              </p>
              <h2 className="admin-stat-value">
                {totalOrders}
              </h2>
            </div>
          </div>
          {/* CUSTOMER SEARCH */}
          <div style={{
            marginTop: "25px",
            marginBottom: "20px"
          }}>
            <input
              type="text"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="Search by customer name, phone or email..."
              style={{
                width: "100%",
                maxWidth: "500px",
                padding: "14px 16px",
                background: "#15140F",
                border: "1px solid #665538",
                color: "#F5EBDD",
                outline: "none",
                fontFamily: "Montserrat, sans-serif",
                fontSize: "12px"
              }}
            />
          </div>
          <p style={{
            color: "#A99570",
            fontSize: "10px",
            marginBottom: "20px",
            letterSpacing: "1px"
          }}>
            CUSTOMER RECORDS ARE GROUPED BY EMAIL ADDRESS FIRST.
          </p>
          {/* CUSTOMER LIST */}
          {ordersLoading ? (
            <div className="admin-empty">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="admin-empty">
              No customer records found yet. Customers will appear here when orders are placed.
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="admin-empty">
              No customers match your search.
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>CUSTOMER</th>
                    <th>CONTACT DETAILS</th>
                    <th>ORDERS</th>
                    <th>TOTAL ORDER VALUE</th>
                    <th>LAST ORDER</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.key}>
                      <td>
                        <strong>{customer.name}</strong>
                      </td>
                      {/* PHONE AND EMAIL ON SEPARATE LINES */}
                      <td>
                        <div className="customer-contact-details">
                          <div className="customer-phone">
                            {customer.phone || "No phone"}
                          </div>
                          <div className="customer-email">
                            {customer.email || "No email"}
                          </div>
                        </div>
                      </td>
                      <td>
                        {customer.orderCount}
                      </td>
                      <td>
                        {formatCurrency(customer.totalOrderValue)}
                      </td>
                      <td>
                        {formatDate(customer.lastOrderDate)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-product-edit"
                          onClick={() =>
                            setSelectedCustomerKey(customer.key)
                          }
                        >
                          VIEW HISTORY
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* SELECTED CUSTOMER DETAILS */}
          {selectedCustomer && (
            <div style={{
              marginTop: "35px",
              padding: "25px",
              background: "#11100C",
              border: "1px solid #665538"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "15px",
                marginBottom: "20px"
              }}>
                <div>
                  <p style={{
                    color: "#A99570",
                    fontSize: "10px",
                    letterSpacing: "2px",
                    marginBottom: "8px"
                  }}>
                    CUSTOMER PROFILE
                  </p>
                  <h3 style={{
                    color: "#D6B878",
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "25px",
                    margin: 0
                  }}>
                    {selectedCustomer.name}
                  </h3>
                </div>
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => setSelectedCustomerKey(null)}
                >
                  CLOSE
                </button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "20px",
                marginBottom: "25px"
              }}>
                <div>
                  <p className="admin-stat-label">PHONE NUMBER</p>
                  <p style={{ color: "#F5EBDD", fontSize: "12px" }}>
                    {selectedCustomer.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="admin-stat-label">EMAIL ADDRESS</p>
                  <p style={{ color: "#F5EBDD", fontSize: "12px" }}>
                    {selectedCustomer.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="admin-stat-label">DELIVERY ADDRESS</p>
                  <p style={{ color: "#F5EBDD", fontSize: "12px" }}>
                    {selectedCustomer.address || "Not provided"}
                    {selectedCustomer.district
                      ? `, ${selectedCustomer.district}`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="admin-stat-label">TOTAL ORDERS</p>
                  <p style={{ color: "#D6B878", fontSize: "16px" }}>
                    {selectedCustomer.orderCount}
                  </p>
                </div>
                <div>
                  <p className="admin-stat-label">TOTAL ORDER VALUE</p>
                  <p style={{ color: "#D6B878", fontSize: "16px" }}>
                    {formatCurrency(selectedCustomer.totalOrderValue)}
                  </p>
                </div>
              </div>
              <h4 style={{
                color: "#D6B878",
                fontSize: "11px",
                letterSpacing: "2px",
                marginBottom: "15px"
              }}>
                CUSTOMER ORDER HISTORY
              </h4>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ORDER ID</th>
                      <th>DATE</th>
                      <th>ORDER ITEMS</th>
                      <th>TOTAL</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selectedCustomer.orders]
                      .sort(
                        (a, b) =>
                          new Date(b.created_at || 0) -
                          new Date(a.created_at || 0)
                      )
                      .map((order) => (
                        <tr key={order.id}>
                          <td>
                            #{String(order.id).slice(0, 8)}
                          </td>
                          <td>
                            {formatDate(order.created_at)}
                          </td>
                          <td>
                            {getOrderItems(order.order_items)}
                          </td>
                          <td>
                            {formatCurrency(order.total)}
                          </td>
                          <td>
                            {order.status || "Pending"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
  {/* BUSINESS REPORTS */}
  <section id="reports" className="admin-section">
    <h2 className="admin-section-heading">
      BUSINESS REPORTS
    </h2>
    {/* REPORT FILTERS */}
    <div className="admin-product-form-wrapper">
      <h3 className="admin-product-form-title">
        GENERATE REPORT
      </h3>
      <label>REPORT PERIOD</label>
      <select
        value={reportPeriod}
        onChange={(event) => setReportPeriod(event.target.value)}
      >
        <option value="today">Today</option>
        <option value="this-week">This Week</option>
        <option value="this-month">This Month</option>
        <option value="all-time">All Time</option>
        <option value="custom">Custom Date Range</option>
      </select>
      {reportPeriod === "custom" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginTop: "18px"
        }}>
          <div>
            <label>START DATE</label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(event) => setReportStartDate(event.target.value)}
            />
          </div>
          <div>
            <label>END DATE</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(event) => setReportEndDate(event.target.value)}
            />
          </div>
        </div>
      )}
      {!reportDateRange.valid && (
        <p className="admin-error">
          Please select a valid start date and end date.
          The end date must not be earlier than the start date.
        </p>
      )}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "22px"
      }}>
        <button
          type="button"
          className="admin-button admin-product-save"
          onClick={handleExportReportsCSV}
          disabled={!reportDateRange.valid || ordersLoading}
        >
          DOWNLOAD EXCEL / CSV
        </button>
        <button
          type="button"
          className="admin-button"
          onClick={() => window.print()}
          disabled={!reportDateRange.valid || ordersLoading}
        >
          PRINT / SAVE AS PDF
        </button>
      </div>
    </div>
    {ordersLoading ? (
      <div className="admin-empty">
        Loading report data...
      </div>
    ) : !reportDateRange.valid ? (
      <div className="admin-empty">
        Select a valid reporting date range to view reports.
      </div>
    ) : (
      <>
        {/* SALES REPORT */}
        <h3 className="admin-product-list-title">
          SALES SUMMARY
        </h3>
        <div className="admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">TOTAL SALES</p>
            <h2 className="admin-stat-value">
              {formatCurrency(reportSalesTotal)}
            </h2>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">COMPLETED / ACTIVE ORDERS</p>
            <h2 className="admin-stat-value">
              {reportTotalOrders}
            </h2>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">AVERAGE ORDER VALUE</p>
            <h2 className="admin-stat-value">
              {formatCurrency(reportAverageOrderValue)}
            </h2>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">CANCELLED ORDERS</p>
            <h2 className="admin-stat-value">
              {reportCancelledOrders}
            </h2>
          </div>
        </div>
        {/* PRODUCT PERFORMANCE */}
        <h3 className="admin-product-list-title">
          PRODUCT PERFORMANCE
        </h3>
        {reportProducts.length === 0 ? (
          <div className="admin-empty">
            No product sales found for this period.
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>PERFUME</th>
                  <th>QUANTITY SOLD</th>
                  <th>NUMBER OF ORDERS</th>
                </tr>
              </thead>
              <tbody>
                {reportProducts.map((product, index) => (
                  <tr key={product.name}>
                    <td>#{index + 1}</td>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{product.quantitySold}</td>
                    <td>{product.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* CUSTOMER PERFORMANCE */}
        <h3 className="admin-product-list-title">
          CUSTOMER SPENDING REPORT
        </h3>
        {reportCustomers.length === 0 ? (
          <div className="admin-empty">
            No customer purchases found for this period.
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>ORDERS</th>
                  <th>TOTAL SPENT</th>
                </tr>
              </thead>
              <tbody>
                {reportCustomers.map((customer) => (
                  <tr key={customer.key}>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>
                    <td>{customer.email || "No email"}</td>
                    <td>{customer.phone || "No phone"}</td>
                    <td>{customer.orderCount}</td>
                    <td>
                      {formatCurrency(customer.totalSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}
  </section>
        {/* FOOTER */}
        <footer style={{
          textAlign: "center",
          marginTop: "50px",
          padding: "20px",
          borderTop: "1px solid #403522",
          color: "#806E4D",
          fontSize: "9px",
          letterSpacing: "2px"
        }}>
          ORVÈLIS ADMINISTRATION · PRIVATE ACCESS
        </footer>
      </main>
    </div>
  );
}
export default Admin;
