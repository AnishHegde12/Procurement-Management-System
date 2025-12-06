// seed.js
const initialVendors = [
    {
      name: "ABC Electronics",
      email: "anishghegde@gmail.com",
      contactPerson: "John Doe",
      phone: "+1-123-456-7890",
      category: "Electronics",
    },
    {
      name: "Office Supplies Co.",
      email: "lakshanaghegde@gmail.com",
      contactPerson: "Jane Smith",
      phone: "+1-987-654-3210",
      category: "Office Equipment",
    },
    {
      name: "TechWorld Ltd.",
      email: "book.not.read@gmail.com",
      contactPerson: "Alice Johnson",
      phone: "+1-555-666-7777",
      category: "IT Hardware",
    },
  ];
  
  export async function seedVendors(db) {
    try {
      const vendorsCollection = db.collection("rfpdb");
  
      // Check if collection already has documents
      const count = await vendorsCollection.countDocuments();
      console.log(count);
      if (count === 0) {
        await vendorsCollection.insertMany(initialVendors);
        console.log("✅ Initial vendor data seeded");
      } else {
        console.log("ℹ️ Vendor data already exists, skipping seed");
      }
    } catch (err) {
      console.error("❌ Error seeding vendor data:", err);
    }
  }
  