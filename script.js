const puppeteer = require("puppeteer");
const XLSX = require("xlsx");
const CollectedData = [];
let cnt = 0;

(async () => {
  const browser = await puppeteer.launch({ headless: false, slowMo: 60 });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  await page.goto("https://linkedin.com", {
    args: ["--incognito"],
  });
  await page.setViewport({ width: 1080, height: 1024 });

  await page.waitForSelector("#session_key");
  await page.type("#session_key", "manudwivedi1969@gmail.com");

  await page.waitForSelector("#session_password");
  await page.type("#session_password", "Dummypass@1969");

  await page.keyboard.press("Enter");
  await page.waitForNavigation();

  // type education here
  await page.waitForSelector(".search-global-typeahead__input");
  await page.type(".search-global-typeahead__input", "education");
  await page.keyboard.press("Enter");

  //ul filter list start here
  await page.waitForSelector(".search-reusables__filter-list");
  const searchButtons = await page.$$(".artdeco-pill"); // button class
  // console.log(searchButtons);

  // wait for Company button select
  let index = -10;
  for (let i in searchButtons) {
    const textContent = await page.evaluate(
      (item) => item.textContent,
      searchButtons[i]
    );
    if (textContent.trim() === "Companies") {
      index = i;
      break;
    }
  }
  await searchButtons[index].click();

  //wait for location section select
  await page.waitForSelector("#searchFilter_companyHqGeo");
  const LocationBtn = await page.$("#searchFilter_companyHqGeo");
  await LocationBtn.click();

  //wait for type india
  const input = 'input[aria-label="Add a location"]';
  await page.waitForSelector(input);
  await page.type(input, "India");

  const locationListId = await page.$eval(input, (value) =>
    value.getAttribute("aria-controls")
  );
  //select the first option
  await page.waitForSelector(`#${locationListId}`);
  const locationList = await page.$(`#${locationListId}`);
  const spanElement = await locationList.$("span");
  await spanElement.click();

  //click on show result button here
  let showResult = 'button[data-control-name="filter_show_results"]';
  const showResultButton = await page.$(showResult);
  await showResultButton.click();

  //select the industry here
  await page.waitForSelector("#searchFilter_industryCompanyVertical");
  await page.click("#searchFilter_industryCompanyVertical");

  //wait for type industry
  const industryLabel = 'input[aria-label="Add an industry"]';
  await page.waitForSelector(industryLabel);
  await page.type(industryLabel, "education");

  //select the first option
  const industryListId = await page.$eval(industryLabel, (value) =>
    value.getAttribute("aria-controls")
  );
  await page.waitForSelector(`#${industryListId}`);
  const industryList = await page.$(`#${industryListId}`);
  const industryElement = await industryList.$("span");
  await industryElement.click();

  let clickBtns = await page.$$(
    'button[data-control-name="filter_show_results"]'
  );
  await clickBtns[1].click();

  //select the company size here
  await page.waitForSelector("#searchFilter_companySize");
  const compSizeBtn = await page.$("#searchFilter_companySize");
  await compSizeBtn.click();

  await page.waitForSelector("#companySize-C");
  const companySize = await page.$("#companySize-C");
  await companySize.click();

  await page.waitForSelector('button[data-control-name="filter_show_results"]');
  clickBtns = await page.$$('button[data-control-name="filter_show_results"]');
  console.log(clickBtns[1]);
  await clickBtns[2].click();

  //code for next button unit it gets disabled
  const nextPageBtn = await page.waitForSelector(".artdeco-button--icon-right");
  let nextPageProperty = await (
    await nextPageBtn.getProperty("disabled")
  ).jsonValue();

  while (!nextPageProperty) {
    console.log("fetch start..");
    await page.waitForSelector(".search-results-container"); // parent container
    const links = await page.$$(".scale-down"); //gets
    for (let i of links) {
      const link = await (await i.getProperty("href")).jsonValue();
      let newPage = await browser.newPage();
      let n = await captureData(newPage, link);
      if (n === -1) return arrayToSheet(CollectedData, "comp");

      await page.waitForSelector(".artdeco-button--icon-right");
      await newPage.close();
    }

    await page.waitForSelector(".artdeco-button--icon-right");
    const nextBtn = await page.$(".artdeco-button--icon-right");
    await nextBtn.click();
    await page.waitForNavigation();
    nextPageProperty = await (
      await nextPageBtn.getProperty("disabled")
    ).jsonValue();
  }
})();

async function captureData(pg, link) {
  try {
    await pg.goto(link + "about");

    await pg.waitForSelector(".org-page-details-module__card-spacing ");
    const companyInfo = await pg.$(".org-page-details-module__card-spacing ");
    const dl = await companyInfo.$("dl");
    const allDl = await dl.$$("dd");

    const spanWebsite = await allDl[0].$("span");
    const website = await (
      await spanWebsite.getProperty("textContent")
    ).jsonValue();

    const spanPhone = await allDl[1].$("span");
    const phonenumber = await (
      await spanPhone.getProperty("textContent")
    ).jsonValue();

    const Industry = await allDl[2].$("span");
    let industry;
    if (!Industry)
      industry = await (await allDl[2].getProperty("textContent")).jsonValue();
    else
      industry = await (await Industry.getProperty("textContent")).jsonValue();

    const CompanySize = await allDl[3].$("span");
    let companySize;
    if (!CompanySize)
      companySize = await (
        await allDl[3].getProperty("textContent")
      ).jsonValue();
    else
      companySize = await (
        await CompanySize.getProperty("textContent")
      ).jsonValue();

    const obj = {
      industry: industry.trim(),
      companySize: companySize.trim(),
      phonenumber: phonenumber.trim(),
      website: website.trim(),
    };

    CollectedData.push(obj);
    console.log(cnt);
    // console.log(CollectedData);
    cnt++;
    if (cnt === 3) return -1;
  } catch (error) {
    // console.log(error);
  }
}

function arrayToSheet(CollectedData, website) {
  const ws = XLSX.utils.json_to_sheet(CollectedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${website}CollectedData.xlsx`);
}
