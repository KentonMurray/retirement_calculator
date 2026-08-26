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

// --- Monte Carlo simulation ---

function randNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = (sortedArr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

function runMonteCarlo(base, mc) {
  const yearsToRetire = base.retireAge - base.currentAge;
  const yearsInRetirement = base.lifeExpectancy - base.retireAge;
  const totalYears = yearsToRetire + yearsInRetirement;
  const balancesByYear = Array.from({ length: totalYears + 1 }, () => []);
  const endingBalances = [];
  const depletionAges = [];
  let successes = 0;

  for (let t = 0; t < mc.numSimulations; t++) {
    let balance = base.currentSavings;
    balancesByYear[0].push(balance);

    let inflationFactor = 1;
    for (let y = 0; y < yearsToRetire; y++) {
      const annualReturn = Math.max(-0.99, base.preReturn + mc.preReturnStdDev * randNormal());
      const annualInflation = Math.max(-0.99, base.inflation + mc.inflationStdDev * randNormal());
      const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate) + base.monthlyContribution;
      }
      inflationFactor *= (1 + annualInflation);
      balancesByYear[y + 1].push(balance);
    }

    let withdrawalNeeded = Math.max(0, (base.desiredIncome - base.otherIncome) * inflationFactor);
    let depleted = false;
    for (let y = 0; y < yearsInRetirement; y++) {
      const annualReturn = Math.max(-0.99, base.postReturn + mc.postReturnStdDev * randNormal());
      const annualInflation = Math.max(-0.99, base.inflation + mc.inflationStdDev * randNormal());
      balance -= withdrawalNeeded;
      if (balance <= 0) {
        if (!depleted) {
          depletionAges.push(base.retireAge + y + (withdrawalNeeded > 0 ? 1 - Math.abs(balance) / withdrawalNeeded : 1));
          depleted = true;
        }
        balance = 0;
      } else {
        balance = balance * (1 + annualReturn);
      }
      withdrawalNeeded = withdrawalNeeded * (1 + annualInflation);
      balancesByYear[yearsToRetire + y + 1].push(balance);
    }

    if (!depleted) successes++;
    endingBalances.push(balance);
  }

  endingBalances.sort((a, b) => a - b);
  depletionAges.sort((a, b) => a - b);

  const ages = balancesByYear.map((_, i) => base.currentAge + i);
  const p10 = [];
  const p50 = [];
  const p90 = [];
  balancesByYear.forEach((yearBalances) => {
    const sorted = [...yearBalances].sort((a, b) => a - b);
    p10.push(percentile(sorted, 0.10));
    p50.push(percentile(sorted, 0.50));
    p90.push(percentile(sorted, 0.90));
  });

  return {
    ages, p10, p50, p90,
    successRate: successes / mc.numSimulations,
    medianEnding: percentile(endingBalances, 0.5),
    p10Ending: percentile(endingBalances, 0.10),
    medianDepletionAge: depletionAges.length ? percentile(depletionAges, 0.5) : null,
  };
}

function drawFanChart(ages, p10, p50, p90, retireAge) {
  const mcCanvas = document.getElementById('mcChart');
  const c = mcCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = mcCanvas.clientWidth || 900;
  const cssHeight = 360;
  mcCanvas.width = cssWidth * dpr;
  mcCanvas.height = cssHeight * dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, cssWidth, cssHeight);

  const padding = { top: 20, right: 20, bottom: 36, left: 70 };
  const w = cssWidth - padding.left - padding.right;
  const h = cssHeight - padding.top - padding.bottom;

  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const maxBalance = Math.max(...p90, 1);

  const xForAge = (age) => padding.left + ((age - minAge) / (maxAge - minAge || 1)) * w;
  const yForBalance = (bal) => padding.top + h - (bal / maxBalance) * h;

  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.fillStyle = '#93a3b3';
  c.font = '12px sans-serif';
  c.textAlign = 'right';
  c.textBaseline = 'middle';
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = (maxBalance / ySteps) * i;
    const y = yForBalance(val);
    c.beginPath();
    c.moveTo(padding.left, y);
    c.lineTo(padding.left + w, y);
    c.stroke();
    c.fillText(fmtMoney(val), padding.left - 10, y);
  }

  const retireX = xForAge(retireAge);
  c.strokeStyle = 'rgba(99, 179, 237, 0.6)';
  c.setLineDash([4, 4]);
  c.beginPath();
  c.moveTo(retireX, padding.top);
  c.lineTo(retireX, padding.top + h);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#63b3ed';
  c.textAlign = 'center';
  c.fillText('Retirement', retireX, padding.top - 8);

  c.fillStyle = '#93a3b3';
  c.textBaseline = 'top';
  const xSteps = Math.min(8, ages.length - 1) || 1;
  for (let i = 0; i <= xSteps; i++) {
    const age = minAge + ((maxAge - minAge) / xSteps) * i;
    const x = xForAge(age);
    c.fillText(Math.round(age).toString(), x, padding.top + h + 8);
  }

  c.beginPath();
  ages.forEach((age, i) => {
    const x = xForAge(age);
    const y = yForBalance(p90[i]);
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  });
  for (let i = ages.length - 1; i >= 0; i--) {
    c.lineTo(xForAge(ages[i]), yForBalance(p10[i]));
  }
  c.closePath();
  c.fillStyle = 'rgba(79, 209, 197, 0.15)';
  c.fill();

  c.setLineDash([3, 3]);
  c.strokeStyle = 'rgba(79, 209, 197, 0.5)';
  c.lineWidth = 1;
  [p10, p90].forEach((series) => {
    c.beginPath();
    ages.forEach((age, i) => {
      const x = xForAge(age);
      const y = yForBalance(series[i]);
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.stroke();
  });
  c.setLineDash([]);

  c.beginPath();
  c.strokeStyle = '#4fd1c5';
  c.lineWidth = 2.5;
  ages.forEach((age, i) => {
    const x = xForAge(age);
    const y = yForBalance(p50[i]);
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  });
  c.stroke();
}

const mcForm = document.getElementById('mc-form');
const mcResultsEl = document.getElementById('mc-results');
let lastMcResult = null;
let lastMcRetireAge = null;

mcForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const base = {
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

  if (base.retireAge <= base.currentAge) {
    alert('Retirement age must be greater than current age.');
    return;
  }
  if (base.lifeExpectancy <= base.retireAge) {
    alert('Life expectancy must be greater than retirement age.');
    return;
  }

  const mcInputs = {
    preReturnStdDev: Number(document.getElementById('preReturnStdDev').value) / 100,
    postReturnStdDev: Number(document.getElementById('postReturnStdDev').value) / 100,
    inflationStdDev: Number(document.getElementById('inflationStdDev').value) / 100,
    numSimulations: Math.min(5000, Math.max(100, Math.round(Number(document.getElementById('numSimulations').value)))),
  };

  const result = runMonteCarlo(base, mcInputs);
  lastMcResult = result;
  lastMcRetireAge = base.retireAge;

  document.getElementById('mcSuccessRate').textContent = `${(result.successRate * 100).toFixed(1)}%`;
  document.getElementById('mcMedianEnding').textContent = fmtMoney(result.medianEnding);
  document.getElementById('mcP10Ending').textContent = fmtMoney(result.p10Ending);
  document.getElementById('mcMedianDepletion').textContent = result.medianDepletionAge
    ? Math.round(result.medianDepletionAge)
    : 'N/A';

  mcResultsEl.classList.remove('hidden');
  drawFanChart(result.ages, result.p10, result.p50, result.p90, base.retireAge);
});

window.addEventListener('resize', () => {
  if (lastMcResult && !mcResultsEl.classList.contains('hidden')) {
    drawFanChart(lastMcResult.ages, lastMcResult.p10, lastMcResult.p50, lastMcResult.p90, lastMcRetireAge);
  }
});
