const fs = require('fs');
const path = './frontend/src/pages/PermitReadiness.jsx';
let c = fs.readFileSync(path, 'utf8');

const newLogic = `
  const loadAssessmentAndReqs = async () => {
    if (!selectedBizId) return;
    setLoading(true);
    try {
      // 1. Get assessment existence
      const r1 = await fetch(\`\${API}/assessments\`, { headers });
      const assessmentsData = await r1.json();
      const bizAssessments = Array.isArray(assessmentsData) ? assessmentsData.filter(a => String(a.business_id) === String(selectedBizId)) : [];
      const latestAssessment = bizAssessments.length > 0 ? bizAssessments[0] : null;
      
      if (latestAssessment) {
        setAssessment(latestAssessment);

        // 2. Fetch authoritative checklist from DB
        let r2 = await fetch(\`\${API}/compliance/business/\${selectedBizId}\`, { headers });
        let complianceData = await r2.json();

        // 3. Fallback: if empty, force evaluation
        if (!complianceData.checklist || complianceData.checklist.length === 0) {
            await fetch(\`\${API}/compliance/evaluate/\${selectedBizId}\`, { method: 'POST', headers });
            r2 = await fetch(\`\${API}/compliance/business/\${selectedBizId}\`, { headers });
            complianceData = await r2.json();
        }

        setRequirements(complianceData.checklist || []);
      } else {
        setAssessment(null);
        setRequirements([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessmentAndReqs();
  }, [selectedBizId]);

  const updateReqStatus = async (requirement_id, newStatus) => {
    try {
        const res = await fetch(\`\${API}/compliance/business/\${selectedBizId}/requirement/\${requirement_id}\`, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            // Update local state to reflect DB immediately
            setRequirements(prev => prev.map(r => 
                r.requirement_id === requirement_id ? { ...r, status: newStatus } : r
            ));
        } else {
            alert('Failed to update requirement status.');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred while updating status.');
    }
  };

  const selectedBusiness = businesses.find(b => String(b.id) === String(selectedBizId));

  const stats = useMemo(() => {
    let have = 0;
    let need = 0;
    let unchecked = 0;
    requirements.forEach(r => {
      const s = r.status;
      if (s === 'Submitted' || s === 'Approved') have++;
      else if (s === 'Missing') need++;
      else unchecked++;
    });
    const total = requirements.length;
    const percentage = total > 0 ? Math.round((have / total) * 100) : 0;
    return { have, need, unchecked, total, percentage };
  }, [requirements]);
`;

// Replace everything from `const loadAssessmentAndReqs = async () => {` to `}, [requirements, reqStatus]);`
c = c.replace(/const loadAssessmentAndReqs = async \(\) => {[\s\S]*?}, \[requirements, reqStatus\]\);/, newLogic);

// Now replace UI parts where it uses `reqStatus[req.id]` and `req.id` to use `req.status` and `req.requirement_id`
c = c.replace(/const s = reqStatus\[req\.id\];/g, "const s = req.status;");
c = c.replace(/const isHave = s === 'HAVE';/g, "const isHave = s === 'Submitted' || s === 'Approved';");
c = c.replace(/const isNeed = s === 'NEED';/g, "const isNeed = s === 'Missing';");

// Update buttons
c = c.replace(/updateReqStatus\(req\.id, 'HAVE'\)/g, "updateReqStatus(req.requirement_id, 'Submitted')");
c = c.replace(/updateReqStatus\(req\.id, 'NEED'\)/g, "updateReqStatus(req.requirement_id, 'Missing')");
c = c.replace(/updateReqStatus\(req\.id, 'UNCHECKED'\)/g, "updateReqStatus(req.requirement_id, 'Missing')"); // Can't easily undo to 'Not Checked' DB-wise except mapping to Missing

// Remove localStorage state declaration
c = c.replace(/const \[reqStatus, setReqStatus\] = useState\(\{.*?\}\);/g, "");

fs.writeFileSync(path, c);
console.log('Patched PermitReadiness.jsx');
