const puppeteer = require("puppeteer");
const firebase = require("firebase-admin");
const serviceAccount = require("./credentials.json");
const loginDetails = require("./login");
const customerDetails = [];

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://www.zoho.com/mail/login.html");

  // Sign in button
  await page.waitForSelector(".zlogin-apps");
  const login = await page.$(".zlogin-apps");
  await login.click();

  //Email
  await page.waitForSelector("#login_id");
  const emailInput = await page.$("#login_id");
  const next = await page.$("#nextbtn");

  await emailInput.type(loginDetails.email);
  await page.waitForTimeout(2000);
  await next.click();

  //Password
  await page.waitForTimeout(7000);
  const passwordInput = await page.$("#password");
  const signIn = await page.$("#nextbtn");

  await passwordInput.type(loginDetails.password);
  await page.waitForTimeout(2000);
  await signIn.click();
  await page.waitForTimeout(7000);

  //Select the email
  await page.waitForTimeout(7000);
  const emails = await page.$$(".zmLFCD");

  for (let email of emails) {
    // Click data
    await email.click();

    //Get data
    await page.waitForTimeout(5000);
    const t = await page.$eval(".SC_phd", (el) => el.textContent);

    if (t.includes("eBay item sold")) {
      const tableEl = await page.$eval("table", (el) => el.id);
      const id = tableEl.substring(
        tableEl.lastIndexOf("_") + 1,
        tableEl.lastIndexOf("p")
      );
      const title = t.split(":")[1].trim();
      const name = await page.$eval(`#x_${id}name`, (el) => el.textContent);
      const street = await page.$eval(`#x_${id}street`, (el) => el.textContent);
      const zip = await page.$eval(
        `#x_${id}cityStateZip`,
        (el) => el.textContent
      );
      const price = await page.$eval(
        `.x_${id}item-detail-bold`,
        (el) => el.textContent
      );
      const itemNum = await page.$$eval(`.x_${id}item-detail-info`, (items) =>
        items.map((item) => item.textContent)
      );

      const details = {
        name: name.trim(),
        street: street.trim(),
        zip: generatePostCode(zip),
        county: generateCounty(zip),
        itemNum: itemNum !== null ? itemNum[1].split(":")[1].trim() : "",
        productName:
          itemNum !== null
            ? title.split("(")[0].trim() +
              "(" +
              itemNum[2].split(":")[1].trim() +
              ")"
            : "",
        quantity: itemNum[4].split(":")[1].trim(),
        price: price.split("£")[1].trim(),
      };

      customerDetails.push(details);
    } else {
      continue;
    }
  }
  //Send data to the database
  dataSend();

  // Delete emails
  await page.waitForTimeout(2000);
  const checkbox = await page.$$(".msi-uncheck");
  await page.waitForTimeout(1000);
  await checkbox[2].click();

  await page.waitForTimeout(2000);
  const deleteBtn = await page.$(".msi-action");
  await page.waitForTimeout(1000);
  deleteBtn.click();

  await page.waitForTimeout(3000);
  const deleteEl = await page.$("#zm_dropDown ul li:nth-child(2)");
  await page.waitForTimeout(3000);
  deleteEl.click();
  await page.waitForTimeout(2000);

  await browser.close();
})();

function dataSend() {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://invoiceapp-d6088.firebaseio.com",
  });

  const db = firebase.database();
  const ref = db.ref("data");

  const usersRef = ref.child("details");
  usersRef.set({
    customerDetails,
  });
}

function generateCounty(zip) {
  const one = zip.trim().substring(0, 6).toUpperCase().trim();
  const two = zip.trim().substring(0, 7).toUpperCase().trim();
  if (!one.includes(" ") && !two.includes(" ")) {
    return zip.trim().substring(7).trim();
  } else {
    return zip.trim().substring(8).trim();
  }
}

function generatePostCode(zip) {
  const postCode = zip.trim().substring(0, 8).toUpperCase().trim();
  const pArr = postCode.split("");

  if (postCode.length === 6 && !postCode.includes(" ")) {
    pArr.splice(3, 0, " ");
    return pArr.join("");
  } else if (postCode.length === 7 && !postCode.includes(" ")) {
    pArr.splice(4, 0, " ");
    return pArr.join("");
  } else if (pArr[6] === " ") {
    pArr.pop();
    pArr.splice(3, 0, " ");
    return pArr.join("");
  } else {
    return postCode;
  }
}
