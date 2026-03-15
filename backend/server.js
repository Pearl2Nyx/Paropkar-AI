const fs = require("fs");
const yaml = require("js-yaml");
const express = require("express");

const app = express();
app.use(express.json());

// load Kiro spec
const spec = yaml.load(
  fs.readFileSync("./.kiro/specs/certificate_rules.kiro", "utf8")
);

function calculateApplyDate(deadline, state) {
  const processing = spec.states[state].processing_days;
  const buffer = 3;

  const d = new Date(deadline);
  d.setDate(d.getDate() - processing - buffer);

  return d.toISOString().split("T")[0];
}

app.post("/calculate", (req, res) => {
  const { deadline, state } = req.body;

  const applyDate = calculateApplyDate(deadline, state);

  res.json({
    apply_by: applyDate
  });
});

app.listen(3000, () => {
  console.log("Paropkar AI backend running on port 3000");
});
