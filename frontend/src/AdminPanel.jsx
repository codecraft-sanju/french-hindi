import { useState, useMemo, useEffect } from "react"; // CHANGED: Added useEffect

const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const OrdersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const ProductsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// CHANGED: Base URL for API
const API_URL = "http://localhost:5000/api";

export default function AdminPanel({ onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // CHANGED: Initialized with empty arrays, data will be fetched from backend
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  
  const [toast, setToast] = useState(null);

  // CHANGED: Fetch admin data on mount
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetching both orders and products in parallel
        const [ordersRes, productsRes] = await Promise.all([
          fetch(`${API_URL}/orders`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/products`)
        ]);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
        showToast("Error loading dashboard data");
      }
    };

    fetchAdminData();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // CHANGED: API call to update order status
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setOrders(orders.map(order => order._id === orderId ? { ...order, status: newStatus } : order));
        showToast(`Order updated to ${newStatus}`);
      } else {
        showToast("Failed to update status");
      }
    } catch (error) {
      showToast("Error updating order");
    }
  };

  // CHANGED: API call to delete product
  const deleteProduct = async (productId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setProducts(products.filter(p => p._id !== productId));
        showToast("Product removed successfully");
      } else {
        showToast("Failed to remove product");
      }
    } catch (error) {
      showToast("Error removing product");
    }
  };

  // CHANGED: API call to create new product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const newProductData = {
      name: formData.get("name"),
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
      categoryIdentifier: formData.get("categoryIdentifier"), // Expected by backend
    };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProductData)
      });

      if (res.ok) {
        const savedProduct = await res.json();
        
        // Fetch products again to ensure we get the populated category name correctly
        const fetchRes = await fetch(`${API_URL}/products`);
        const updatedProducts = await fetchRes.json();
        setProducts(updatedProducts);

        setIsAddProductModalOpen(false);
        showToast(`${savedProduct.name} added to inventory`);
      } else {
        showToast("Failed to add product. Check details.");
      }
    } catch (error) {
      showToast("Error adding product");
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // CHANGED: Mapped to real DB fields (orderId, and checking nested customerAddress/user name)
      const customerName = order.customerAddress?.fullName || order.user?.name || "";
      const matchesSearch = order.orderId.toLowerCase().includes(orderSearch.toLowerCase()) || 
                            customerName.toLowerCase().includes(orderSearch.toLowerCase());
      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, statusFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // CHANGED: Access nested category name from populated DB object
      const categoryName = product.category?.name || "";
      return product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
             categoryName.toLowerCase().includes(productSearch.toLowerCase());
    });
  }, [products, productSearch]);

  const totalRevenue = useMemo(() => orders.filter(o => o.status === "Delivered").reduce((sum, order) => sum + order.total, 0), [orders]);
  const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === "Pending" || o.status === "Processing").length, [orders]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] flex flex-col md:flex-row relative overflow-hidden">
      
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-black text-white px-6 py-3 rounded-xl shadow-xl font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            {toast}
          </div>
        </div>
      )}

      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col p-6 shrink-0 z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-bold text-lg">R</div>
          <span className="font-bold text-xl tracking-tight">AdminPanel</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "dashboard" ? "bg-black text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
            <DashboardIcon /> Dashboard
          </button>
          <button onClick={() => setActiveTab("orders")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "orders" ? "bg-black text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
            <OrdersIcon /> Orders
            {pendingOrdersCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingOrdersCount}</span>}
          </button>
          <button onClick={() => setActiveTab("products")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "products" ? "bg-black text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
            <ProductsIcon /> Inventory
          </button>
        </nav>

        <div className="pt-6 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-3 px-4 mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-sm text-gray-600">A</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Admin User</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Superadmin</span>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-all">
            <LogoutIcon /> Exit Admin
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen">
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 transform group-hover:scale-110 transition-transform"><DashboardIcon /></div>
                <p className="text-gray-500 text-sm font-semibold mb-2">Delivered Revenue</p>
                <p className="text-4xl font-bold">₹{totalRevenue}</p>
                <p className="text-xs text-green-500 font-bold mt-2 flex items-center gap-1">+12.5% this week</p>
              </div>
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 transform group-hover:scale-110 transition-transform"><OrdersIcon /></div>
                <p className="text-gray-500 text-sm font-semibold mb-2">Pending Fulfillment</p>
                <p className="text-4xl font-bold">{pendingOrdersCount}</p>
                <p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1">Requires attention</p>
              </div>
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 transform group-hover:scale-110 transition-transform"><ProductsIcon /></div>
                <p className="text-gray-500 text-sm font-semibold mb-2">Total Products</p>
                <p className="text-4xl font-bold">{products.length}</p>
                <p className="text-xs text-gray-400 font-bold mt-2 flex items-center gap-1">In active inventory</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-6">Weekly Order Volume</h3>
              <div className="h-48 flex items-end justify-between gap-2">
                {[40, 70, 45, 90, 65, 120, 85].map((height, i) => (
                  <div key={i} className="w-full bg-gray-100 rounded-t-xl relative group">
                    <div 
                      className="absolute bottom-0 w-full bg-black rounded-t-xl transition-all duration-500 ease-out group-hover:bg-blue-600" 
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs font-semibold text-gray-400">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Manage Orders</h2>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                <input 
                  type="text" 
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID or Customer..." 
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black shadow-sm outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-5 font-bold">Order Details</th>
                      <th className="p-5 font-bold">Amount</th>
                      <th className="p-5 font-bold">Status</th>
                      <th className="p-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No orders found</td></tr>
                    ) : filteredOrders.map((order) => (
                      <tr key={order._id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-5">
                          {/* CHANGED: Mapped data properties to backend structure */}
                          <p className="font-bold text-sm">{order.orderId}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {order.customerAddress?.fullName || order.user?.name || "Customer"} • {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-5 font-bold text-sm">₹{order.total}</td>
                        <td className="p-5">
                          <select 
                            value={order.status}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)} // CHANGED: Using MongoDB _id
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-none outline-none cursor-pointer appearance-none ${
                              order.status === "Delivered" ? "bg-green-100 text-green-700" :
                              order.status === "Pending" ? "bg-orange-100 text-orange-700" :
                              order.status === "Cancelled" ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Return Requested">Return Requested</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-black bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors active:scale-95"
                          >
                            <EyeIcon /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
              <button 
                onClick={() => setIsAddProductModalOpen(true)}
                className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                <PlusIcon /> Add Product
              </button>
            </div>

            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
              <input 
                type="text" 
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name or category..." 
                className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-5 font-bold">Product</th>
                      <th className="p-5 font-bold">Price</th>
                      <th className="p-5 font-bold">Stock</th>
                      <th className="p-5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No products found</td></tr>
                    ) : filteredProducts.map((product) => (
                      <tr key={product._id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-5 flex items-center gap-4">
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                          <div>
                            <p className="font-bold text-sm">{product.name}</p>
                            {/* CHANGED: Access nested category name safely */}
                            <p className="text-xs text-gray-500 mt-0.5">{product.category?.name || "Unknown"}</p>
                          </div>
                        </td>
                        <td className="p-5 font-bold text-sm">₹{product.price}</td>
                        <td className="p-5">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${product.stock < 20 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          {/* CHANGED: Sending MongoDB _id for deletion */}
                          <button onClick={() => deleteProduct(product._id)} className="text-red-500 hover:bg-red-50 font-bold text-sm px-4 py-2 rounded-xl transition-colors active:scale-95">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- Order Details Drawer --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold tracking-tight">Order Details</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90"><CloseIcon /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Information</h4>
                <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                  {/* CHANGED: Mapped correctly to database address structure */}
                  <p className="font-bold text-sm">{selectedOrder.customerAddress?.fullName || selectedOrder.user?.name || "Unknown"}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.customerAddress?.phone || "N/A"}</p>
                  <p className="text-sm text-gray-600">
                    {selectedOrder.customerAddress ? `${selectedOrder.customerAddress.street}, ${selectedOrder.customerAddress.city}, ${selectedOrder.customerAddress.state}` : "No address provided"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Summary</h4>
                <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{item.qty}x {item.name}</span>
                      <span className="font-bold text-black">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-500">Total Paid</span>
                    <span className="text-xl font-bold text-black">₹{selectedOrder.total}</span>
                  </div>
                  {/* CHANGED: payment Method mapped correctly */}
                  <div className="text-xs font-semibold text-gray-400 uppercase text-right">Via {selectedOrder.paymentMethod}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Product Modal --- */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddProductModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-2xl font-bold tracking-tight">Add New Product</h3>
              <button onClick={() => setIsAddProductModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90"><CloseIcon /></button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                <input required name="name" type="text" placeholder="e.g. India Gate Basmati Rice" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                  <input required name="price" type="number" min="1" placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Stock</label>
                  <input required name="stock" type="number" min="0" placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                {/* CHANGED: Sent values match backend categoryIdentifier exactly */}
                <select required name="categoryIdentifier" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all appearance-none cursor-pointer">
                  <option value="kirana">Kirana & Staples</option>
                  <option value="fastfood">Fast Food</option>
                  <option value="fresh">Fresh Produce</option>
                  <option value="dairy">Dairy & Bakery</option>
                </select>
              </div>
              
              <div className="pt-4 mt-2 border-t border-gray-50">
                <button type="submit" className="w-full bg-black text-white py-4 rounded-[20px] font-bold text-lg hover:bg-gray-800 active:scale-95 transition-all shadow-lg">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}