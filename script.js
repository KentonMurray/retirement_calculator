const form = document.getElementById('calc-form');
const resultsSection = document.getElementById('results');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

const fmtMoney = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function project(inputs) {
  const {
    currentAge, retireAge, lifeExpectancy,
    currentSavings, monthlyContribution,
    preReturn, postReturn, inflation,
    desiredIncome, otherIncome,
  } = inputs;

  const monthlyPreRate = Math.pow(1 + preReturn, 1 / 12) - 1;

  // Accumulation phase: month-by-month, contribution at end of each month.
  const balanceByAge = []; // { age, balance } sampled yearly
  let balance = currentSavings;
  let totalContributed = 0;
  const totalMonths = Math.round((retireAge - currentAge) * 12);

  balanceByAge.push({ age: currentAge, balance });

  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyPreRate) + monthlyContribution;
    totalContributed += monthlyContribution;
    if (m % 12 === 0) {
      balanceByAge.push({ age: currentAge + m / 12, balance });
    }
  }
  if (totalMonths % 12 !== 0) {
    balanceByAge.push({ age: retireAge, balance });
  }

  const balanceAtRetirement = balance;

  // Inflate today's-dollar income needs to retirement-year dollars.
  const yearsToRetire = retireAge - currentAge;
  const inflationFactor = Math.pow(1 + inflation, yearsToRetire);
  let withdrawalNeeded = Math.max(0, (desiredIncome - otherIncome) * inflationFactor);
  const firstYearWithdrawal = withdrawalNeeded;

  // Drawdown phase: year-by-year, withdraw at start of year, grow remainder, withdrawal grows with inflation.
  let drawBalance = balanceAtRetirement;
  let lastsUntilAge = null;
  const yearsInRetirement = Math.max(0, lifeExpectancy - retireAge);

  for (let y = 0; y < yearsInRetirement; y++) {
    drawBalance -= withdrawalNeeded;
    if (drawBalance <= 0) {
      lastsUntilAge = retireAge + y + (withdrawalNeeded > 0 ? 1 - Math.abs(drawBalance) / withdrawalNeeded : 1);
      drawBalance = 0;
    } else {
      drawBalance = drawBalance * (1 + postReturn);
    }
    balanceByAge.push({ age: retireAge + y + 1, balance: drawBalance });
    withdrawalNeeded = withdrawalNeeded * (1 + inflation);
    if (lastsUntilAge !== null) break;
  }

  return {
    balanceAtRetirement,
    totalContributed,
    firstYearWithdrawal,
    lastsUntilAge,
    lifeExpectancy,
    retireAge,
    balanceByAge,
  };
}

function drawChart(balanceByAge, retireAge) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 900;
  const cssHeight = 360;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const padding = { top: 20, right: 20, bottom: 36, left: 70 };
  const w = cssWidth - padding.left - padding.right;
  const h = cssHeight - padding.top - padding.bottom;

  const ages = balanceByAge.map(p => p.age);
  const balances = balanceByAge.map(p => p.balance);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const maxBalance = Math.max(...balances, 1);

  const xForAge = (age) => padding.left + ((age - minAge) / (maxAge - minAge || 1)) * w;
  const yForBalance = (bal) => padding.top + h - (bal / maxBalance) * h;

  // Grid lines + y labels
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.fillStyle = '#93a3b3';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = (maxBalance / ySteps) * i;
    const y = yForBalance(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + w, y);
    ctx.stroke();
    ctx.fillText(fmtMoney(val), padding.left - 10, y);
  }

  // Retirement age marker
  const retireX = xForAge(retireAge);
  ctx.strokeStyle = 'rgba(99, 179, 237, 0.6)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(retireX, padding.top);
  ctx.lineTo(retireX, padding.top + h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#63b3ed';
  ctx.textAlign = 'center';
  ctx.fillText('Retirement', retireX, padding.top - 8);

  // X axis labels
  ctx.fillStyle = '#93a3b3';
  ctx.textBaseline = 'top';
  const xSteps = Math.min(8, ages.length - 1) || 1;
  for (let i = 0; i <= xSteps; i++) {
    const age = minAge + ((maxAge - minAge) / xSteps) * i;
    const x = xForAge(age);
    ctx.fillText(Math.round(age).toString(), x, padding.top + h + 8);
  }

  // Balance line
  ctx.beginPath();
  ctx.strokeStyle = '#4fd1c5';
  ctx.lineWidth = 2.5;
  balanceByAge.forEach((p, i) => {
    const x = xForAge(p.age);
    const y = yForBalance(p.balance);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill under curve
  ctx.lineTo(xForAge(balanceByAge[balanceByAge.length - 1].age), padding.top + h);
  ctx.lineTo(xForAge(balanceByAge[0].age), padding.top + h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(79, 209, 197, 0.12)';
  ctx.fill();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const inputs = {
    currentAge: Number(document.getElementById('currentAge').value),
    retireAge: Number(document.getElementById('retireAge').value),
    lifeExpectancy: Number(document.getElementById('lifeExpectancy').value),
    currentSavings: Number(document.getElementById('currentSavings').value),
    monthlyContribution: Number(document.getElementById('monthlyContribution').value),
    preReturn: Number(document.getElementById('preReturn').value) / 100,
    postReturn: Number(document.getElementById('postReturn').value) / 100,
    inflation: Number(document.getElementById('inflation').value) / 100,
    desiredIncome: Number(document.getElementById('desiredIncome').value),
    otherIncome: Number(document.getElementById('otherIncome').value),
  };

  if (inputs.retireAge <= inputs.currentAge) {
    alert('Retirement age must be greater than current age.');
    return;
  }
  if (inputs.lifeExpectancy <= inputs.retireAge) {
    alert('Life expectancy must be greater than retirement age.');
    return;
  }

  const result = project(inputs);

  document.getElementById('statAtRetirement').textContent = fmtMoney(result.balanceAtRetirement);
  document.getElementById('statContributed').textContent = fmtMoney(result.totalContributed);
  document.getElementById('statWithdrawal').textContent = fmtMoney(result.firstYearWithdrawal);
  document.getElementById('statLastsUntil').textContent = result.lastsUntilAge
    ? `${Math.round(result.lastsUntilAge)}`
    : `${result.lifeExpectancy}+`;

  const verdict = document.getElementById('verdict');
  if (result.lastsUntilAge) {
    verdict.textContent = `At this rate, your savings run out around age ${Math.round(result.lastsUntilAge)}, before your life expectancy of ${result.lifeExpectancy}. Consider saving more, retiring later, or reducing planned spending.`;
    verdict.className = 'verdict bad';
  } else {
    verdict.textContent = `Your savings are projected to last through age ${result.lifeExpectancy}. Nice work!`;
    verdict.className = 'verdict good';
  }

  resultsSection.classList.remove('hidden');
  drawChart(result.balanceByAge, inputs.retireAge);
});

window.addEventListener('resize', () => {
  if (!resultsSection.classList.contains('hidden')) {
    form.requestSubmit();
  }
});

// --- Tabs ---

const tabBtnSavings = document.getElementById('tabBtnSavings');
const tabBtnPension = document.getElementById('tabBtnPension');
const tabSavings = document.getElementById('tab-savings');
const tabPension = document.getElementById('tab-pension');

function showTab(name) {
  const showSavings = name === 'savings';
  tabSavings.classList.toggle('hidden', !showSavings);
  tabPension.classList.toggle('hidden', showSavings);
  tabBtnSavings.classList.toggle('active', showSavings);
  tabBtnPension.classList.toggle('active', !showSavings);
  tabBtnSavings.setAttribute('aria-selected', String(showSavings));
  tabBtnPension.setAttribute('aria-selected', String(!showSavings));
}

tabBtnSavings.addEventListener('click', () => showTab('savings'));
tabBtnPension.addEventListener('click', () => showTab('pension'));

// --- Pension calculator ---

const pensionForm = document.getElementById('pension-form');
const pensionResults = document.getElementById('pension-results');
let lastPensionAnnual = 0;

function projectPension(inputs) {
  const { yearsOfService, finalAvgSalary, accrualRate, pensionRetireAge, normalRetireAge, earlyReduction } = inputs;

  const grossAnnual = yearsOfService * accrualRate * finalAvgSalary;
  const yearsEarly = Math.max(0, normalRetireAge - pensionRetireAge);
  const reductionFraction = Math.min(1, yearsEarly * earlyReduction);
  const annualPension = grossAnnual * (1 - reductionFraction);

  return {
    annualPension,
    monthlyPension: annualPension / 12,
    reductionPercent: reductionFraction * 100,
    replacementRatio: finalAvgSalary > 0 ? (annualPension / finalAvgSalary) * 100 : 0,
  };
}

pensionForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const inputs = {
    yearsOfService: Number(document.getElementById('yearsOfService').value),
    finalAvgSalary: Number(document.getElementById('finalAvgSalary').value),
    accrualRate: Number(document.getElementById('accrualRate').value) / 100,
    pensionRetireAge: Number(document.getElementById('pensionRetireAge').value),
    normalRetireAge: Number(document.getElementById('normalRetireAge').value),
    earlyReduction: Number(document.getElementById('earlyReduction').value) / 100,
  };

  const result = projectPension(inputs);
  lastPensionAnnual = result.annualPension;

  document.getElementById('pensionAnnual').textContent = fmtMoney(result.annualPension);
  document.getElementById('pensionMonthly').textContent = fmtMoney(result.monthlyPension);
  document.getElementById('pensionReduction').textContent = `${result.reductionPercent.toFixed(1)}%`;
  document.getElementById('pensionReplacement').textContent = `${result.replacementRatio.toFixed(1)}%`;

  pensionResults.classList.remove('hidden');
});

document.getElementById('usePensionBtn').addEventListener('click', () => {
  document.getElementById('otherIncome').value = Math.round(lastPensionAnnual);
  showTab('savings');
});
