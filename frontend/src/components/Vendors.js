import React, { useEffect, useState } from "react";

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch("http://localhost:5000/vendors");
        const data = await response.json();

        const formatted = data.map((v) => ({
          id: v._id,
          name: v.name,
          contactPerson: v.contactPerson,
          email: v.email,
          phone: v.phone,
          category: v.category,
        }));

        setVendors(formatted);
      } catch (err) {
        console.error("Error fetching vendors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  if (loading) {
    return <div className="text-center p-6 text-gray-500">Loading vendors...</div>;
  }

  return (
    <div className="vendor-list p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Vendor Directory</h2>

      <div className="overflow-x-auto">
        <table
          className="min-w-full"
          style={{ borderCollapse: "collapse", border: "2px solid #4B5563" }}
        >
          <thead>
            <tr>
              <th style={{ border: "2px solid #4B5563", padding: "12px", backgroundColor: "#E0F2FE" }}>Company Name</th>
              <th style={{ border: "2px solid #4B5563", padding: "12px", backgroundColor: "#E0F2FE" }}>Contact Person</th>
              <th style={{ border: "2px solid #4B5563", padding: "12px", backgroundColor: "#E0F2FE" }}>Email</th>
              <th style={{ border: "2px solid #4B5563", padding: "12px", backgroundColor: "#E0F2FE" }}>Phone</th>
              <th style={{ border: "2px solid #4B5563", padding: "12px", backgroundColor: "#E0F2FE" }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ border: "2px solid #4B5563", padding: "12px", textAlign: "center" }}>
                  No vendors found.
                </td>
              </tr>
            ) : (
              vendors.map((vendor, idx) => (
                <tr key={vendor.id} style={{ backgroundColor: idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF" }}>
                  <td style={{ border: "2px solid #4B5563", padding: "12px" }}>{vendor.name}</td>
                  <td style={{ border: "2px solid #4B5563", padding: "12px" }}>{vendor.contactPerson}</td>
                  <td style={{ border: "2px solid #4B5563", padding: "12px" }}>{vendor.email}</td>
                  <td style={{ border: "2px solid #4B5563", padding: "12px" }}>{vendor.phone}</td>
                  <td style={{ border: "2px solid #4B5563", padding: "12px", textAlign: "center" }}>
                    <span style={{ backgroundColor: "#BFDBFE", color: "#1D4ED8", padding: "2px 8px", borderRadius: "9999px", fontSize: "0.875rem" }}>
                      {vendor.category}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
