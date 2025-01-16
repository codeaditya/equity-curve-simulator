const rewardRiskRatioInput = document.getElementById("rewardRiskRatio");
const winPercentageInput = document.getElementById("winPercentage");
const riskPerTradeInput = document.getElementById("riskPerTrade");
const numTradesInput = document.getElementById("numTrades");
const avgTradesPerYearInput = document.getElementById("avgTradesPerYear");
const numSimulationsInput = document.getElementById("numSimulations");
const runSimulationButton = document.getElementById("runSimulation");
const equityCurveChartCanvas = document.getElementById("equityCurveChart");
const resultsTableBody = document
  .getElementById("resultsTable")
  .getElementsByTagName("tbody")[0];
const tableHeaders = document
  .getElementById("resultsTable")
  .querySelectorAll("thead th");

// Theme Toggle
const themeCheckbox = document.getElementById("theme-checkbox");

// Function to set the initial theme based on preference
function setInitialTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  if (
    savedTheme === "dark" ||
    (savedTheme === null && prefersDarkScheme.matches)
  ) {
    document.documentElement.setAttribute("data-theme", "dark");
    themeCheckbox.checked = true;
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    themeCheckbox.checked = false;
  }
}

// Call setInitialTheme on page load
setInitialTheme();

// Event listener for theme change
themeCheckbox.addEventListener("change", () => {
  const newTheme = themeCheckbox.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateChartColors(newTheme);
});

// Function to update chart colors based on theme
function updateChartColors(theme) {
  if (equityCurveChart) {
    const chartColors = {
      grid:
        theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.7)",
      text: theme === "dark" ? "#fff" : "#212529",
      line: theme === "dark" ? "#339dff" : "#007bff",
    };

    // Update x-axis colors
    equityCurveChart.options.scales.x.ticks.color = chartColors.text;
    equityCurveChart.options.scales.x.grid.color = chartColors.grid;
    equityCurveChart.options.scales.x.title.color = chartColors.text;

    // Update y-axis colors
    equityCurveChart.options.scales.y.ticks.color = chartColors.text;
    equityCurveChart.options.scales.y.grid.color = chartColors.grid;
    equityCurveChart.options.scales.y.title.color = chartColors.text;

    // Update line colors
    equityCurveChart.data.datasets.forEach((dataset) => {
      dataset.borderColor = chartColors.line;
    });

    equityCurveChart.update();
  }
}

let equityCurveChart = null;
let currentSortColumn = null; // Keep track of the currently sorted column
let isAscending = true; // Keep track of the sorting order

runSimulationButton.addEventListener("click", runSimulation);

function runSimulation() {
  const rewardRiskRatio = parseFloat(rewardRiskRatioInput.value);
  const winPercentage = parseFloat(winPercentageInput.value) / 100;
  const riskPerTrade = parseFloat(riskPerTradeInput.value) / 100;
  const numTrades = parseInt(numTradesInput.value);
  const avgTradesPerYear = parseInt(avgTradesPerYearInput.value);
  const numSimulations = parseInt(numSimulationsInput.value);
  const startingCapital = 100;

  const equityCurveData = [];
  const simulationResults = [];

  for (let i = 0; i < numSimulations; i++) {
    const equityCurve = generateEquityCurve(
      startingCapital,
      numTrades,
      winPercentage,
      rewardRiskRatio,
      riskPerTrade
    );
    equityCurveData.push(equityCurve);

    const cagr = calculateCAGR(
      startingCapital,
      equityCurve[equityCurve.length - 1],
      numTrades,
      avgTradesPerYear
    );
    const peakDrawdown = calculatePeakDrawdown(equityCurve);
    const avgDrawdown = calculateAverageDrawdown(equityCurve);
    const tradesToRecoverPeak = calculateTradesToRecoverFromPeak(equityCurve);
    const tradesToRecoverAvg = calculateTradesToRecoverFromAvg(
      equityCurve,
      avgDrawdown
    );
    const calmarRatio = calculateCalmarRatio(cagr, peakDrawdown);

    simulationResults.push({
      cagr: cagr,
      calmar: calmarRatio,
      peakDrawdown: peakDrawdown * 100,
      avgDrawdown: avgDrawdown * 100,
      tradesToRecoverPeak: tradesToRecoverPeak,
      tradesToRecoverAvg: tradesToRecoverAvg,
    });
  }

  updateChart(equityCurveData);
  populateResultsTable(simulationResults);
}

function generateEquityCurve(
  startingCapital,
  numTrades,
  winPercentage,
  rewardRiskRatio,
  riskPerTrade
) {
  let capital = startingCapital;
  const equityCurve = [capital];

  for (let i = 0; i < numTrades; i++) {
    const win = Math.random() < winPercentage;
    let tradeResult;

    if (win) {
      tradeResult = capital * riskPerTrade * rewardRiskRatio;
    } else {
      tradeResult = -capital * riskPerTrade;
    }

    capital += tradeResult;
    if (capital > 0) equityCurve.push(capital);
  }

  return equityCurve;
}

function calculateCAGR(
  startingCapital,
  endingCapital,
  numTrades,
  avgTradesPerYear
) {
  const numYears = numTrades / avgTradesPerYear;
  const cagr =
    (Math.pow(endingCapital / startingCapital, 1 / numYears) - 1) * 100;
  return cagr;
}

function calculatePeakDrawdown(equityCurve) {
  let maxSoFar = equityCurve[0];
  let maxDrawdown = 0;

  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > maxSoFar) {
      maxSoFar = equityCurve[i];
    }
    const drawdown = (maxSoFar - equityCurve[i]) / maxSoFar;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

function calculateAverageDrawdown(equityCurve) {
  let maxSoFar = equityCurve[0];
  let drawdowns = [];

  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > maxSoFar) {
      maxSoFar = equityCurve[i];
    }
    const drawdown = (maxSoFar - equityCurve[i]) / maxSoFar;
    drawdowns.push(drawdown);
  }

  const avgDrawdown =
    drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length;
  return avgDrawdown;
}

function calculateTradesToRecover(equityCurve, drawdownThreshold = 0) {
  const numOfTradesInDrawdown = [];
  let peakEquitySoFar = equityCurve[0];
  let tradesSinceLastPeak = 0;
  let inDrawdown = false;

  for (let i = 0; i < equityCurve.length; i++) {
    if (equityCurve[i] >= peakEquitySoFar) {
      // New peak or full recovery
      if (inDrawdown) {
        numOfTradesInDrawdown.push(tradesSinceLastPeak);
      }
      peakEquitySoFar = equityCurve[i];
      tradesSinceLastPeak = 0;
      inDrawdown = false;
    } else {
      // Still in drawdown or potential drawdown
      tradesSinceLastPeak++;
      const drawdown = (peakEquitySoFar - equityCurve[i]) / peakEquitySoFar;
      if (drawdown >= drawdownThreshold) {
        // Consider it a significant drawdown
        inDrawdown = true;
      }
    }
  }

  // Handle case where the last drawdown is still ongoing
  if (inDrawdown) {
    numOfTradesInDrawdown.push(tradesSinceLastPeak);
  }

  return numOfTradesInDrawdown;
}

function calculateTradesToRecoverFromPeak(equityCurve) {
  const tradesInDrawdown = calculateTradesToRecover(equityCurve);
  return tradesInDrawdown.length > 0 ? Math.max(...tradesInDrawdown) : 0;
}

function calculateTradesToRecoverFromAvg(equityCurve, avgDrawdown) {
  const tradesInDrawdown = calculateTradesToRecover(equityCurve, avgDrawdown);
  return tradesInDrawdown.length > 0
    ? Math.round(
        tradesInDrawdown.reduce((sum, val) => sum + val, 0) /
          tradesInDrawdown.length
      )
    : 0;
}

function calculateCalmarRatio(cagr, peakDrawdown) {
  if (peakDrawdown === 0) {
    return 0; // Avoid division by zero
  }
  return cagr / (peakDrawdown * 100);
}

function updateChart(equityCurveData) {
  // Destroy the existing chart if it exists
  if (equityCurveChart) {
    equityCurveChart.destroy();
  }

  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  const chartColors = {
    grid:
      currentTheme === "dark"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.7)",
    text: currentTheme === "dark" ? "#fff" : "#212529",
    line: currentTheme === "dark" ? "#339dff" : "#007bff",
  };

  equityCurveChart = new Chart(equityCurveChartCanvas, {
    type: "line",
    data: {
      labels: Array.from({ length: equityCurveData[0].length }, (_, i) => i),
      datasets: equityCurveData.map((curve, index) => ({
        label: `Simulation ${index + 1}`,
        data: curve,
        borderColor: chartColors.line,
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Trade Number",
            color: chartColors.text,
          },
          grid: {
            color: chartColors.grid,
          },
          ticks: {
            color: chartColors.text,
          },
        },
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Equity (Log Scale)",
            color: chartColors.text,
          },
          grid: {
            color: chartColors.grid,
          },
          ticks: {
            color: chartColors.text,
          },
        },
      },
    },
  });
}

function addAggregateRows(simulationsResults) {
  const numRows = 3; // Highest, Average, Lowest
  const numCols = 7; // Including the empty first cell
  const aggregateRows = Array.from({ length: numRows }, () =>
    Array(numCols).fill("")
  );
  const aggregateLabels = ["Highest", "Average", "Lowest"];

  // Calculate aggregates
  for (let col = 1; col < numCols; col++) {
    const values = simulationsResults.map((result) => {
      switch (col) {
        case 1:
          return result.cagr;
        case 2:
          return result.calmar;
        case 3:
          return result.peakDrawdown;
        case 4:
          return result.avgDrawdown;
        case 5:
          return result.tradesToRecoverPeak;
        case 6:
          return result.tradesToRecoverAvg;
        default:
          return 0;
      }
    });

    aggregateRows[0][col] = Math.max(...values).toFixed(2); // Highest
    aggregateRows[1][col] = (
      values.reduce((sum, val) => sum + val, 0) / values.length
    ).toFixed(2); // Average
    aggregateRows[2][col] = Math.min(...values).toFixed(2); // Lowest

    // Ensure Trades to Recover are integers
    if (col >= 5) {
      aggregateRows[0][col] = Math.round(aggregateRows[0][col]);
      aggregateRows[1][col] = Math.round(aggregateRows[1][col]);
      aggregateRows[2][col] = Math.round(aggregateRows[2][col]);
    }
  }

  // Set labels for aggregate rows
  for (let i = 0; i < numRows; i++) {
    aggregateRows[i][0] = aggregateLabels[i];
  }

  // Prepend aggregate rows to the table body
  for (let i = numRows - 1; i >= 0; i--) {
    const row = resultsTableBody.insertRow(0);
    aggregateRows[i].forEach((value) => {
      const cell = row.insertCell();
      cell.textContent = value;
    });
  }
}

function populateResultsTable(simulationsResults) {
  resultsTableBody.innerHTML = ""; // Clear the table body

  // Add aggregate rows
  addAggregateRows(simulationsResults);

  // Sort the results if a column is already selected for sorting
  if (currentSortColumn !== null) {
    const isAsc = currentSortColumn.classList.contains("sorted-asc");
    sortData(simulationsResults, currentSortColumn.cellIndex, isAsc);
  }

  // Add simulation rows
  simulationsResults.forEach((result, index) => {
    const row = resultsTableBody.insertRow();
    const simNumCell = row.insertCell();
    simNumCell.textContent = `Sim ${index + 1}`;

    const cagrCell = row.insertCell();
    const calmarCell = row.insertCell();
    const peakDrawdownCell = row.insertCell();
    const avgDrawdownCell = row.insertCell();
    const tradesToRecoverPeakCell = row.insertCell();
    const tradesToRecoverAvgCell = row.insertCell();

    cagrCell.textContent = result.cagr.toFixed(2);
    calmarCell.textContent = result.calmar.toFixed(2);
    peakDrawdownCell.textContent = result.peakDrawdown.toFixed(2);
    avgDrawdownCell.textContent = result.avgDrawdown.toFixed(2);
    tradesToRecoverPeakCell.textContent = result.tradesToRecoverPeak;
    tradesToRecoverAvgCell.textContent = result.tradesToRecoverAvg;
  });
}

tableHeaders.forEach((header) => {
  header.addEventListener("click", () => {
    const isAsc = header.classList.contains("sorted-asc");

    // Reset sort icons for other headers
    tableHeaders.forEach((otherHeader) => {
      if (otherHeader !== header) {
        otherHeader.classList.remove("sorted-asc", "sorted-desc");
      }
    });

    // Toggle sort direction
    header.classList.toggle("sorted-asc", !isAsc);
    header.classList.toggle("sorted-desc", isAsc);

    // Update current sort column
    currentSortColumn = header;
    isAscending = !isAsc; // Update sorting order for the next sort

    // Sort data and update table
    const columnIndex = Array.from(tableHeaders).indexOf(header);
    const simulationsResults = Array.from(resultsTableBody.rows)
      .slice(3)
      .map((row) => {
        return {
          cagr: parseFloat(row.cells[1].textContent),
          calmar: parseFloat(row.cells[2].textContent),
          peakDrawdown: parseFloat(row.cells[3].textContent),
          avgDrawdown: parseFloat(row.cells[4].textContent),
          tradesToRecoverPeak: parseInt(row.cells[5].textContent),
          tradesToRecoverAvg: parseInt(row.cells[6].textContent),
        };
      });

    sortData(simulationsResults, columnIndex, isAscending);
    populateResultsTable(simulationsResults);
  });
});

function sortData(data, columnIndex, isAscending) {
  data.sort((a, b) => {
    let aValue, bValue;

    switch (columnIndex) {
      case 1: // CAGR
        aValue = a.cagr;
        bValue = b.cagr;
        break;
      case 2: // CALMAR
        aValue = a.calmar;
        bValue = b.calmar;
        break;
      case 3: // Peak Drawdown
        aValue = a.peakDrawdown;
        bValue = b.peakDrawdown;
        break;
      case 4: // Avg Drawdown
        aValue = a.avgDrawdown;
        bValue = b.avgDrawdown;
        break;
      case 5: // Trades to Recover (Peak)
        aValue = a.tradesToRecoverPeak;
        bValue = b.tradesToRecoverPeak;
        break;
      case 6: // Trades to Recover (Avg)
        aValue = a.tradesToRecoverAvg;
        bValue = b.tradesToRecoverAvg;
        break;
      default:
        return 0;
    }

    return isAscending ? aValue - bValue : bValue - aValue;
  });
}

// Initial simulation on page load
runSimulation();
