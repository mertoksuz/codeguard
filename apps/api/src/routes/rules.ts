import { Router } from "express";

export const rulesRouter = Router();

rulesRouter.get("/", async (_req, res) => {
  const defaultRules = [
    { id: "SRP", name: "Single Responsibility", category: "solid", enabled: true, severity: "error" },
    { id: "OCP", name: "Open/Closed", category: "solid", enabled: true, severity: "warning" },
    { id: "LSP", name: "Liskov Substitution", category: "solid", enabled: true, severity: "error" },
    { id: "ISP", name: "Interface Segregation", category: "solid", enabled: true, severity: "warning" },
    { id: "DIP", name: "Dependency Inversion", category: "solid", enabled: true, severity: "error" },
    { id: "NAMING", name: "Naming Conventions", category: "clean-code", enabled: true, severity: "warning" },
    { id: "COMPLEXITY", name: "Code Complexity", category: "clean-code", enabled: true, severity: "warning" },
    { id: "FILE_LENGTH", name: "File Length", category: "clean-code", enabled: true, severity: "warning" },
    { id: "IMPORTS", name: "Import Organization", category: "clean-code", enabled: true, severity: "info" },
  ];
  res.json({ success: true, data: defaultRules });
});

rulesRouter.put("/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const { enabled, severity } = req.body;
  res.json({ success: true, data: { ruleId, enabled, severity } });
});
