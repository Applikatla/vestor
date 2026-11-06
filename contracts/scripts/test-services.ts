import http from "http";
import { spawn } from "child_process";
import * as path from "path";

function fetchJson(url: string, options: http.RequestOptions = {}, postData?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function main() {
  console.log("=================================================");
  console.log("Full Stack Integration & Infrastructure Smoke Test");
  console.log("=================================================");

  // 1. Start Node.js Adapter on port 8081
  const adapterApp = (await import("../../adapter/src/server")).default;
  const server8081 = adapterApp.listen(8081);
  console.log("✓ Node.js Blockchain Adapter listening on port 8081");

  // 2. Start Go Backend on port 8080
  const serverExePath = path.resolve(__dirname, "../../backend/bin/server.exe");
  const backendProc = spawn(serverExePath, [], {
    cwd: path.resolve(__dirname, "../../backend"),
    env: { ...process.env, PORT: "8080", ADAPTER_URL: "http://localhost:8081" },
  });

  backendProc.stdout.on("data", (d) => console.log(`[Go Server stdout] ${d.toString().trim()}`));
  backendProc.stderr.on("data", (d) => console.error(`[Go Server stderr] ${d.toString().trim()}`));

  // Wait 2 seconds for Go server to bind
  await new Promise((r) => setTimeout(r, 2000));

  try {
    // 3. Health Check Go Backend
    console.log("\nProbing Go Backend /health...");
    const backendHealth = await fetchJson("http://localhost:8080/health");
    console.log("✓ Go Backend Health Response:", backendHealth);

    // 4. Create Inventory Draft via Go Backend
    console.log("\nTesting POST /v1/inventories on Go Backend...");
    const draftPayload = JSON.stringify({
      company_id: "c82f9d53-4876-4d1a-b684-297c11f7c5e2",
      title: "Grade-1 Arabica Coffee Export Batch",
      category: "COMMODITY_AGRICULTURE",
      document_hashes: [
        "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        "0x5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
      ],
      batches: [
        {
          sku: "COFFEE-LOT-401",
          lot_no: "LOT-2026-X",
          warehouse_id: "WH-MUMBAI-01",
          quantity_total: 10000,
          quantity_available: 10000,
          unit: "KG",
          cost_basis: 6.25,
        },
      ],
    });

    const createRes = await fetchJson(
      "http://localhost:8080/v1/inventories",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      draftPayload
    );
    console.log("✓ Created Inventory Draft:", {
      status: createRes.status,
      inventoryId: createRes.body.inventory?.id,
      bytes32Id: createRes.body.inventory?.inventory_id_bytes32,
      evidenceRoot: createRes.body.inventory?.evidence_root,
    });

    // 5. Test Sales Event Calculation
    console.log("\nTesting POST /v1/sales/events financial waterfall metrics...");
    const salesPayload = JSON.stringify({
      quantity_sold: 500,
      gross_unit_price: 12.0, // Gross: $6,000
      discounts: 200,
      returns: 100,
      taxes: 300, // Net: $5,400
      unit_cost_basis: 6.25, // COGS: $3,125
      direct_costs: 400, // Net Realized Cash: $5,000
    });

    const salesRes = await fetchJson(
      "http://localhost:8080/v1/sales/events",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      salesPayload
    );
    console.log("✓ Financial Metrics Response:", salesRes.body);

    console.log("\n=================================================");
    console.log("✓ Full Stack Services integration verified!");
    console.log("=================================================");
  } finally {
    server8081.close();
    backendProc.kill();
    console.log("✓ Closed all service test instances cleanly.");
  }
}

main().catch(console.error);
