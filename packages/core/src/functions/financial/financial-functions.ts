/**
 * Financial Functions for Cyber Sheet Excel
 * Week 8 Days 4-5 Implementation
 * 
 * Implements Excel-compatible financial functions for:
 * - Time value of money (PV, FV, PMT, NPER, RATE)
 * - Loan calculations (IPMT, PPMT)
 * - Investment analysis (NPV, IRR, XNPV, XIRR)
 * - Interest rate conversions (EFFECT, NOMINAL)
 */

import { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { filterNumbers, flattenArray } from '../../utils/array-utils';
import { toNumber } from '../../utils/type-utils';

/**
 * NPV - Net Present Value
 * Calculates the net present value of an investment based on a discount rate
 * and a series of future cash flows (periodic payments).
 * 
 * Formula: NPV = Σ(value_i / (1 + rate)^i) where i starts from 1
 * 
 * @param rate - The discount rate per period
 * @param values - Series of cash flows (can be positive or negative)
 * @returns Net present value
 * 
 * @example
 * =NPV(10%, 300, 400, 500) → 1000.51
 * =NPV(8%, -1000, 300, 300, 300, 300) → NPV starting at period 1
 */
export const NPV: FormulaFunction = (rate, ...values) => {
  const rateNum = toNumber(rate);
  if (rateNum instanceof Error) return rateNum;
  
  // Excel returns #NUM! for negative rates
  if (rateNum < 0) {
    return new Error('#NUM!');
  }
  
  // Flatten all value arguments and filter to numbers
  const cashFlows = filterNumbers(flattenArray(values));
  
  if (cashFlows.length === 0) {
    return new Error('#NUM!');
  }
  
  let npv = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    // Cash flows start at period 1 (not period 0)
    npv += cashFlows[i] / Math.pow(1 + rateNum, i + 1);
  }
  
  return npv;
};

/**
 * XNPV - Net Present Value with irregular dates
 * Calculates NPV for cash flows that occur at irregular intervals.
 * 
 * @param rate - The discount rate per year
 * @param values - Series of cash flows
 * @param dates - Dates corresponding to each cash flow
 * @returns Net present value with irregular dates
 * 
 * @example
 * =XNPV(10%, {-1000, 300, 400}, {"2024-01-01", "2024-06-15", "2024-12-31"})
 */
export const XNPV: FormulaFunction = (rate, values, dates) => {
  const rateNum = toNumber(rate);
  if (rateNum instanceof Error) return rateNum;
  
  // Excel returns #NUM! for negative rates
  if (rateNum < 0) {
    return new Error('#NUM!');
  }
  
  const cashFlows = filterNumbers(Array.isArray(values) ? values : [values]);
  const dateArray = flattenArray(Array.isArray(dates) ? dates : [dates]);
  
  if (cashFlows.length === 0 || dateArray.length === 0) {
    return new Error('#NUM!');
  }
  
  if (cashFlows.length !== dateArray.length) {
    return new Error('#NUM!');
  }
  
  // Convert dates to Date objects or Excel serial numbers
  const dateValues: number[] = [];
  for (let i = 0; i < dateArray.length; i++) {
    const dateVal = dateArray[i];
    
    if (typeof dateVal === 'number') {
      dateValues.push(dateVal);
    } else if (typeof dateVal === 'string') {
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) {
        return new Error('#VALUE!');
      }
      // Convert to days since epoch (Excel uses days since 1900-01-01)
      dateValues.push(date.getTime() / (1000 * 60 * 60 * 24));
    } else if (dateVal instanceof Date) {
      dateValues.push(dateVal.getTime() / (1000 * 60 * 60 * 24));
    } else {
      return new Error('#VALUE!');
    }
  }
  
  // First date is the reference date (period 0)
  const firstDate = dateValues[0];
  let xnpv = 0;
  
  for (let i = 0; i < cashFlows.length; i++) {
    const daysDiff = dateValues[i] - firstDate;
    const yearsDiff = daysDiff / 365;
    xnpv += cashFlows[i] / Math.pow(1 + rateNum, yearsDiff);
  }
  
  return xnpv;
};

/**
 * PV - Present Value
 * Calculates the present value of an investment or loan based on constant
 * periodic payments and a constant interest rate.
 * 
 * Formula: PV = PMT × [(1 - (1 + rate)^(-nper)) / rate] + FV / (1 + rate)^nper
 * 
 * @param rate - Interest rate per period
 * @param nper - Total number of payment periods
 * @param pmt - Payment made each period (negative for payments you make)
 * @param fv - Future value (default 0)
 * @param type - 0 = payment at end of period, 1 = payment at beginning (default 0)
 * @returns Present value
 * 
 * @example
 * =PV(5%/12, 60, -200, 0, 0) → Present value of $200/month loan at 5% for 5 years
 */
export const PV: FormulaFunction = (rate, nper, pmt, fv = 0, type = 0) => {
  const rateNum = toNumber(rate);
  const nperNum = toNumber(nper);
  const pmtNum = toNumber(pmt);
  const fvNum = toNumber(fv);
  const typeNum = toNumber(type);
  
  if (rateNum instanceof Error) return rateNum;
  if (nperNum instanceof Error) return nperNum;
  if (pmtNum instanceof Error) return pmtNum;
  if (fvNum instanceof Error) return fvNum;
  if (typeNum instanceof Error) return typeNum;
  
  if (nperNum < 0) {
    return new Error('#NUM!');
  }
  
  // Special case: rate = 0
  if (rateNum === 0) {
    return -(pmtNum * nperNum + fvNum);
  }
  
  // Standard PV formula
  const pvifа = (1 - Math.pow(1 + rateNum, -nperNum)) / rateNum;
  const pvif = Math.pow(1 + rateNum, -nperNum);
  
  let pv = -(pmtNum * pvifа + fvNum * pvif);
  
  // Adjust for payment at beginning of period
  if (typeNum === 1) {
    pv = pv * (1 + rateNum);
  }
  
  return pv;
};

/**
 * FV - Future Value
 * Calculates the future value of an investment based on periodic constant
 * payments and a constant interest rate.
 * 
 * Formula: FV = PMT × [((1 + rate)^nper - 1) / rate] + PV × (1 + rate)^nper
 * 
 * @param rate - Interest rate per period
 * @param nper - Total number of payment periods
 * @param pmt - Payment made each period (negative for payments you make)
 * @param pv - Present value (default 0)
 * @param type - 0 = payment at end of period, 1 = payment at beginning (default 0)
 * @returns Future value
 * 
 * @example
 * =FV(6%/12, 120, -100, 0, 0) → Future value of $100/month at 6% for 10 years
 */
export const FV: FormulaFunction = (rate, nper, pmt, pv = 0, type = 0) => {
  const rateNum = toNumber(rate);
  const nperNum = toNumber(nper);
  const pmtNum = toNumber(pmt);
  const pvNum = toNumber(pv);
  const typeNum = toNumber(type);
  
  if (rateNum instanceof Error) return rateNum;
  if (nperNum instanceof Error) return nperNum;
  if (pmtNum instanceof Error) return pmtNum;
  if (pvNum instanceof Error) return pvNum;
  if (typeNum instanceof Error) return typeNum;
  
  if (nperNum < 0) {
    return new Error('#NUM!');
  }
  
  // Special case: rate = 0
  if (rateNum === 0) {
    return -(pvNum + pmtNum * nperNum);
  }
  
  // Standard FV formula
  const fvifа = ((Math.pow(1 + rateNum, nperNum) - 1) / rateNum);
  const fvif = Math.pow(1 + rateNum, nperNum);
  
  let fv = -(pmtNum * fvifа + pvNum * fvif);
  
  // Adjust for payment at beginning of period
  if (typeNum === 1) {
    fv = fv * (1 + rateNum);
  }
  
  return fv;
};

/**
 * PMT - Payment
 * Calculates the periodic payment for a loan based on constant payments
 * and a constant interest rate.
 * 
 * Formula: PMT = (rate × PV) / (1 - (1 + rate)^(-nper)) + FV × rate / ((1 + rate)^nper - 1)
 * 
 * @param rate - Interest rate per period
 * @param nper - Total number of payment periods
 * @param pv - Present value (loan amount)
 * @param fv - Future value (default 0)
 * @param type - 0 = payment at end of period, 1 = payment at beginning (default 0)
 * @returns Payment amount per period
 * 
 * @example
 * =PMT(4%/12, 360, 200000) → Monthly payment on $200k loan at 4% for 30 years
 */
export const PMT: FormulaFunction = (rate, nper, pv, fv = 0, type = 0) => {
  const rateNum = toNumber(rate);
  const nperNum = toNumber(nper);
  const pvNum = toNumber(pv);
  const fvNum = toNumber(fv);
  const typeNum = toNumber(type);
  
  if (rateNum instanceof Error) return rateNum;
  if (nperNum instanceof Error) return nperNum;
  if (pvNum instanceof Error) return pvNum;
  if (fvNum instanceof Error) return fvNum;
  if (typeNum instanceof Error) return typeNum;
  
  if (nperNum < 0) {
    return new Error('#NUM!');
  }
  
  // Special case: rate = 0
  if (rateNum === 0) {
    return -(pvNum + fvNum) / nperNum;
  }
  
  // Standard PMT formula
  const pvifа = (1 - Math.pow(1 + rateNum, -nperNum)) / rateNum;
  const fvif = Math.pow(1 + rateNum, -nperNum);
  
  let pmt = -(pvNum + fvNum * fvif) / pvifа;
  
  // Adjust for payment at beginning of period
  if (typeNum === 1) {
    pmt = pmt / (1 + rateNum);
  }
  
  return pmt;
};

/**
 * IPMT - Interest Payment
 * Calculates the interest portion of a payment for a specific period.
 * 
 * @param rate - Interest rate per period
 * @param per - Period for which you want to find the interest (1 to nper)
 * @param nper - Total number of payment periods
 * @param pv - Present value (loan amount)
 * @param fv - Future value (default 0)
 * @param type - 0 = payment at end of period, 1 = payment at beginning (default 0)
 * @returns Interest payment for the specified period
 * 
 * @example
 * =IPMT(4%/12, 1, 360, 200000) → Interest portion of first payment
 */
export const IPMT: FormulaFunction = (rate, per, nper, pv, fv = 0, type = 0) => {
  const rateNum = toNumber(rate);
  const perNum = toNumber(per);
  const nperNum = toNumber(nper);
  const pvNum = toNumber(pv);
  const fvNum = toNumber(fv);
  const typeNum = toNumber(type);
  
  if (rateNum instanceof Error) return rateNum;
  if (perNum instanceof Error) return perNum;
  if (nperNum instanceof Error) return nperNum;
  if (pvNum instanceof Error) return pvNum;
  if (fvNum instanceof Error) return fvNum;
  if (typeNum instanceof Error) return typeNum;
  
  if (perNum < 1 || perNum > nperNum) {
    return new Error('#NUM!');
  }
  
  // Calculate payment amount
  const pmt = PMT(rateNum, nperNum, pvNum, fvNum, typeNum);
  if (pmt instanceof Error) return pmt;
  
  // If payment at beginning and this is first period, interest is 0
  if (typeNum === 1 && perNum === 1) {
    return 0;
  }
  
  // Calculate remaining principal at start of period using PV of remaining payments
  // The remaining balance is the present value of the remaining (nper - per + 1) payments
  const remainingPeriods = nperNum - perNum + 1;
  
  let remainingBalance: number;
  if (rateNum === 0) {
    remainingBalance = (pmt as number) * remainingPeriods;
  } else {
    const pvifa = (1 - Math.pow(1 + rateNum, -remainingPeriods)) / rateNum;
    remainingBalance = -(pmt as number) * pvifa;
  }
  
  // Interest for this period is the remaining balance times the rate
  const ipmt = -(remainingBalance * rateNum);
  
  return ipmt;
};

/**
 * PPMT - Principal Payment
 * Calculates the principal portion of a payment for a specific period.
 * 
 * @param rate - Interest rate per period
 * @param per - Period for which you want to find the principal (1 to nper)
 * @param nper - Total number of payment periods
 * @param pv - Present value (loan amount)
 * @param fv - Future value (default 0)
 * @param type - 0 = payment at end of period, 1 = payment at beginning (default 0)
 * @returns Principal payment for the specified period
 * 
 * @example
 * =PPMT(4%/12, 1, 360, 200000) → Principal portion of first payment
 */
export const PPMT: FormulaFunction = (rate, per, nper, pv, fv = 0, type = 0) => {
  const pmt = PMT(rate, nper, pv, fv, type);
  if (pmt instanceof Error) return pmt;
  
  const ipmt = IPMT(rate, per, nper, pv, fv, type);
  if (ipmt instanceof Error) return ipmt;
  
  return (pmt as number) - (ipmt as number);
};

/**
 * IRR - Internal Rate of Return
 * Calculates the internal rate of return for a series of cash flows.
 * Uses Newton-Raphson method for iterative approximation.
 * 
 * Formula: Find r where NPV = 0 = Σ(CF_i / (1+r)^i)
 * 
 * @param values - Array of cash flows (must include at least one negative and one positive)
 * @param guess - Initial guess for the rate (default 0.1 = 10%)
 * @returns Internal rate of return
 * 
 * @example
 * =IRR({-1000, 300, 400, 500}) → ~0.16 (16%)
 * =IRR({-70000, 12000, 15000, 18000, 21000, 26000}) → ~0.086 (8.6%)
 */
export const IRR: FormulaFunction = (values, guess = 0.1) => {
  const guessNum = typeof guess === 'number' ? guess : toNumber(guess);
  if (guessNum instanceof Error) return guessNum;
  
  const cashFlows = filterNumbers(flattenArray(Array.isArray(values) ? values : [values]));
  
  if (cashFlows.length < 2) {
    return new Error('#NUM!');
  }
  
  // Check for at least one positive and one negative value
  const hasPositive = cashFlows.some(v => v > 0);
  const hasNegative = cashFlows.some(v => v < 0);
  if (!hasPositive || !hasNegative) {
    return new Error('#NUM!');
  }
  
  // Newton-Raphson iteration
  let rate = guessNum;
  const maxIterations = 100;
  const tolerance = 1e-7;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0;
    let dnpv = 0; // Derivative of NPV
    
    for (let i = 0; i < cashFlows.length; i++) {
      const power = i; // IRR uses period 0 for first cash flow
      const denominator = Math.pow(1 + rate, power);
      
      // NPV calculation: CF_0/(1+r)^0 + CF_1/(1+r)^1 + ...
      npv += cashFlows[i] / denominator;
      
      // Derivative: d/dr[CF/(1+r)^i] = -i*CF/(1+r)^(i+1)
      if (power > 0) {
        dnpv -= power * cashFlows[i] / Math.pow(1 + rate, power + 1);
      }
    }
    
    // Check convergence
    if (Math.abs(npv) < tolerance) {
      return rate;
    }
    
    // Newton-Raphson step: r_new = r_old - f(r)/f'(r)
    if (Math.abs(dnpv) < 1e-10) {
      // Derivative too small, can't continue
      return new Error('#NUM!');
    }
    
    rate = rate - npv / dnpv;
    
    // Check for divergence
    if (!isFinite(rate) || rate < -0.99999) {
      return new Error('#NUM!');
    }
  }
  
  // Did not converge
  return new Error('#NUM!');
};

/**
 * XIRR - Internal Rate of Return for Irregular Cash Flows
 * Calculates IRR for a series of cash flows with irregular dates.
 * Uses modified Newton-Raphson method.
 * 
 * @param values - Array of cash flows
 * @param dates - Corresponding dates for each cash flow
 * @param guess - Initial guess for the rate (default 0.1)
 * @returns Internal rate of return (annualized)
 * 
 * @example
 * =XIRR({-1000, 300, 400, 500}, {date1, date2, date3, date4})
 */
export const XIRR: FormulaFunction = (values, dates, guess = 0.1) => {
  const guessNum = typeof guess === 'number' ? guess : toNumber(guess);
  if (guessNum instanceof Error) return guessNum;
  
  const cashFlows = filterNumbers(Array.isArray(values) ? values : [values]);
  const dateArray = flattenArray(Array.isArray(dates) ? dates : [dates]);
  
  if (cashFlows.length < 2 || dateArray.length < 2) {
    return new Error('#NUM!');
  }
  
  if (cashFlows.length !== dateArray.length) {
    return new Error('#NUM!');
  }
  
  // Check for at least one positive and one negative value
  const hasPositive = cashFlows.some(v => v > 0);
  const hasNegative = cashFlows.some(v => v < 0);
  if (!hasPositive || !hasNegative) {
    return new Error('#NUM!');
  }
  
  // Convert dates to numbers (days)
  const dateValues: number[] = [];
  for (let i = 0; i < dateArray.length; i++) {
    const dateVal = dateArray[i];
    
    if (typeof dateVal === 'number') {
      dateValues.push(dateVal);
    } else if (typeof dateVal === 'string') {
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) {
        return new Error('#VALUE!');
      }
      dateValues.push(date.getTime() / (1000 * 60 * 60 * 24));
    } else if (dateVal instanceof Date) {
      dateValues.push(dateVal.getTime() / (1000 * 60 * 60 * 24));
    } else {
      return new Error('#VALUE!');
    }
  }
  
  // First date is reference (t=0)
  const firstDate = dateValues[0];
  
  // Newton-Raphson iteration
  let rate = guessNum;
  const maxIterations = 100;
  const tolerance = 1e-7;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let xnpv = 0;
    let dxnpv = 0; // Derivative
    
    for (let i = 0; i < cashFlows.length; i++) {
      const daysDiff = dateValues[i] - firstDate;
      const yearsDiff = daysDiff / 365;
      
      // XNPV calculation
      const denominator = Math.pow(1 + rate, yearsDiff);
      xnpv += cashFlows[i] / denominator;
      
      // Derivative: d/dr[CF/(1+r)^t] = -t*CF/(1+r)^(t+1)
      dxnpv -= yearsDiff * cashFlows[i] / Math.pow(1 + rate, yearsDiff + 1);
    }
    
    // Check convergence
    if (Math.abs(xnpv) < tolerance) {
      return rate;
    }
    
    // Newton-Raphson step
    if (Math.abs(dxnpv) < 1e-10) {
      return new Error('#NUM!');
    }
    
    rate = rate - xnpv / dxnpv;
    
    // Check for divergence
    if (!isFinite(rate) || rate < -0.99999) {
      return new Error('#NUM!');
    }
  }
  
  // Did not converge
  return new Error('#NUM!');
};

/**
 * NPER - Number of Periods
 * Calculates the number of periods for an investment based on periodic, constant payments
 * and a constant interest rate.
 * 
 * Formula: 
 * - If rate = 0: nper = -(pv + fv) / pmt
 * - If rate ≠ 0: nper = log((pmt * (1 + rate * type) - fv * rate) / (pv * rate + pmt * (1 + rate * type))) / log(1 + rate)
 * 
 * @param rate - Interest rate per period
 * @param pmt - Payment made each period (constant)
 * @param pv - Present value (loan amount or initial investment)
 * @param fv - Future value (default 0)
 * @param type - 0 = payment at end of period, 1 = payment at beginning (default 0)
 * @returns Number of periods
 * 
 * @example
 * =NPER(0.12/12, -100, -1000, 10000) → Number of months to save $10k
 */
export const NPER: FormulaFunction = (rate, pmt, pv, fv = 0, type = 0) => {
  const rateNum = toNumber(rate);
  const pmtNum = toNumber(pmt);
  const pvNum = toNumber(pv);
  const fvNum = toNumber(fv);
  const typeNum = toNumber(type);
  
  if (rateNum instanceof Error) return rateNum;
  if (pmtNum instanceof Error) return pmtNum;
  if (pvNum instanceof Error) return pvNum;
  if (fvNum instanceof Error) return fvNum;
  if (typeNum instanceof Error) return typeNum;
  
  // Special case: zero interest rate
  if (rateNum === 0) {
    if (pmtNum === 0) {
      return new Error('#NUM!');
    }
    return -(pvNum + fvNum) / pmtNum;
  }
  
  // Adjust payment for timing
  const pmtAdjusted = pmtNum * (1 + rateNum * typeNum);
  
  // Calculate numerator and denominator
  const numerator = pmtAdjusted - fvNum * rateNum;
  const denominator = pvNum * rateNum + pmtAdjusted;
  
  // Check for invalid inputs - ratio must be positive for log
  if (denominator === 0 || (numerator / denominator) <= 0) {
    return new Error('#NUM!');
  }
  
  const nper = Math.log(numerator / denominator) / Math.log(1 + rateNum);
  
  if (!isFinite(nper) || nper < 0) {
    return new Error('#NUM!');
  }
  
  return nper;
};

/**
 * RATE - Interest Rate
 * Calculates the interest rate per period of an annuity using Newton-Raphson iteration
 * with smart initial guess and bisection fallback for robust convergence.
 * 
 * @param nper - Total number of payment periods
 * @param pmt - Payment made each period (constant)
 * @param pv - Present value (loan amount)
 * @param fv - Future value (default 0)
 * @param type - 0 = payment at end of period, 1 = payment at beginning (default 0)
 * @param guess - Initial guess for rate (default: smart calculation)
 * @returns Interest rate per period
 * 
 * @example
 * =RATE(360, -954.83, 200000) → Monthly rate for 30-year mortgage
 */
export const RATE: FormulaFunction = (nper, pmt, pv, fv = 0, type = 0, guess = null) => {
  const nperNum = toNumber(nper);
  const pmtNum = toNumber(pmt);
  const pvNum = toNumber(pv);
  const fvNum = toNumber(fv);
  const typeNum = toNumber(type);
  let guessNum = guess !== null ? toNumber(guess) : null;
  
  if (nperNum instanceof Error) return nperNum;
  if (pmtNum instanceof Error) return pmtNum;
  if (pvNum instanceof Error) return pvNum;
  if (fvNum instanceof Error) return fvNum;
  if (typeNum instanceof Error) return typeNum;
  if (guessNum instanceof Error) guessNum = null;
  
  if (nperNum <= 0) {
    return new Error('#NUM!');
  }
  
  // Special case: if PV + FV + PMT*nper ≈ 0, rate is 0
  if (Math.abs(pvNum + fvNum + pmtNum * nperNum) < 1e-10) {
    return 0;
  }
  
  // Smart initial guess if not provided
  if (guessNum === null) {
    if (Math.abs(pmtNum) < 1e-10) {
      // No payment case: simple interest formula
      if (Math.abs(pvNum) > 1e-10) {
        guessNum = Math.pow(Math.abs(fvNum / pvNum), 1 / nperNum) - 1;
      } else {
        guessNum = 0.1;
      }
    } else {
      // Estimate based on total payments vs total value change
      const totalPayments = pmtNum * nperNum;
      const totalChange = fvNum - pvNum;
      // Simple approximation: rate ≈ (totalChange / totalPayments) / nper
      guessNum = Math.abs((totalChange - totalPayments) / (pvNum * nperNum));
      // Clamp to reasonable range
      guessNum = Math.max(0.001, Math.min(guessNum, 0.5));
    }
  }
  
  // Helper function to evaluate the equation at a given rate
  const evaluateRate = (r: number): number => {
    if (Math.abs(r) < 1e-10) {
      // Near zero rate, use linear approximation
      return pvNum + pmtNum * nperNum + fvNum;
    } else {
      const term2 = Math.pow(1 + r, -nperNum);
      const pmtAdjusted = pmtNum * (1 + r * typeNum);
      return pvNum + pmtAdjusted * (1 - term2) / r + fvNum * term2;
    }
  };
  
  // Newton-Raphson iteration (primary method)
  let rate = guessNum;
  const maxNewtonIterations = 50;
  const tolerance = 1e-7;
  let lastRate = rate;
  
  for (let i = 0; i < maxNewtonIterations; i++) {
    let f: number;
    let df: number;
    
    if (Math.abs(rate) < 1e-10) {
      // Near zero rate, use linear approximation
      f = pvNum + pmtNum * nperNum + fvNum;
      df = -pmtNum * nperNum * (nperNum + 1) / 2 - fvNum * nperNum;
    } else {
      const term2 = Math.pow(1 + rate, -nperNum);
      const pmtAdjusted = pmtNum * (1 + rate * typeNum);
      
      f = pvNum + pmtAdjusted * (1 - term2) / rate + fvNum * term2;
      
      // Derivative calculation
      const dPVIFA = (nperNum * term2 / (rate * (1 + rate)) - (1 - term2) / (rate * rate));
      df = pmtAdjusted * dPVIFA + pmtNum * typeNum * (1 - term2) / rate - fvNum * nperNum * term2 / (1 + rate);
    }
    
    // Check for convergence
    if (Math.abs(f) < tolerance) {
      return rate;
    }
    
    // Check if derivative is too small
    if (Math.abs(df) < 1e-10) {
      break; // Switch to bisection
    }
    
    const newRate = rate - f / df;
    
    // Check for convergence by rate change
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    
    // Detect oscillation or divergence
    if (!isFinite(newRate) || newRate < -0.999 || newRate > 10.0) {
      break; // Switch to bisection
    }
    
    // Detect slow convergence (oscillation)
    if (i > 20 && Math.abs(newRate - lastRate) < Math.abs(newRate - rate) * 0.5) {
      break; // Switch to bisection
    }
    
    lastRate = rate;
    rate = newRate;
  }
  
  // Bisection method fallback (guaranteed convergence)
  let low = -0.99;
  let high = 2.0;
  
  // Find bounds where function changes sign
  const fLow = evaluateRate(low);
  const fHigh = evaluateRate(high);
  
  // If same sign, try to expand bounds
  if (fLow * fHigh > 0) {
    // Try different bounds
    low = 0.0001;
    high = 1.0;
    const fLow2 = evaluateRate(low);
    const fHigh2 = evaluateRate(high);
    
    if (fLow2 * fHigh2 > 0) {
      // One more attempt with wider range
      low = -0.5;
      high = 5.0;
      const fLow3 = evaluateRate(low);
      const fHigh3 = evaluateRate(high);
      
      if (fLow3 * fHigh3 > 0) {
        return new Error('#NUM!'); // Cannot find valid bounds
      }
    }
  }
  
  // Bisection iteration
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const fMid = evaluateRate(mid);
    
    if (Math.abs(fMid) < tolerance || Math.abs(high - low) < tolerance) {
      return mid;
    }
    
    const fLowCurrent = evaluateRate(low);
    
    if (fMid * fLowCurrent < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  
  // Return best estimate from bisection
  return (low + high) / 2;
};

/**
 * EFFECT - Effective Annual Interest Rate
 * Calculates the effective annual interest rate given the nominal rate and
 * number of compounding periods per year.
 * 
 * Formula: effect = (1 + nominal_rate / npery)^npery - 1
 * 
 * @param nominal_rate - Nominal annual interest rate
 * @param npery - Number of compounding periods per year
 * @returns Effective annual interest rate
 * 
 * @example
 * =EFFECT(0.05, 4) → Effective rate for 5% nominal compounded quarterly
 */
export const EFFECT: FormulaFunction = (nominal_rate, npery) => {
  const nominalNum = toNumber(nominal_rate);
  const nperyNum = toNumber(npery);
  
  if (nominalNum instanceof Error) return nominalNum;
  if (nperyNum instanceof Error) return nperyNum;
  
  // Validate inputs
  if (nominalNum <= 0) {
    return new Error('#NUM!');
  }
  
  if (nperyNum < 1) {
    return new Error('#NUM!');
  }
  
  // Truncate npery to integer
  const nperyInt = Math.floor(nperyNum);
  
  // Calculate effective rate
  const effect = Math.pow(1 + nominalNum / nperyInt, nperyInt) - 1;
  
  return effect;
};

/**
 * NOMINAL - Nominal Annual Interest Rate
 * Calculates the nominal annual interest rate given the effective rate and
 * number of compounding periods per year.
 * 
 * Formula: nominal = ((1 + effect_rate)^(1/npery) - 1) * npery
 * 
 * @param effect_rate - Effective annual interest rate
 * @param npery - Number of compounding periods per year
 * @returns Nominal annual interest rate
 * 
 * @example
 * =NOMINAL(0.053543, 4) → Nominal rate for 5.3543% effective rate compounded quarterly
 */
export const NOMINAL: FormulaFunction = (effect_rate, npery) => {
  const effectNum = toNumber(effect_rate);
  const nperyNum = toNumber(npery);
  
  if (effectNum instanceof Error) return effectNum;
  if (nperyNum instanceof Error) return nperyNum;
  
  // Validate inputs
  if (effectNum <= 0) {
    return new Error('#NUM!');
  }
  
  if (nperyNum < 1) {
    return new Error('#NUM!');
  }
  
  // Truncate npery to integer
  const nperyInt = Math.floor(nperyNum);
  
  // Calculate nominal rate
  const nominal = (Math.pow(1 + effectNum, 1 / nperyInt) - 1) * nperyInt;
  
  return nominal;
};
