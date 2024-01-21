import {chromium, devices} from "playwright";
import {writeFileSync, readFileSync} from "fs";
import {ToadScheduler, SimpleIntervalJob, AsyncTask} from "toad-scheduler";
import * as process from "process";

const readCatFile = () => {
    const file = readFileSync("./cats.txt");
    return file.toString().split("\n");
}

const catScraper = async () => {
    //set-up
    const searchUrl   = "https://www.adoptapet.com.au/search?animal_type=custom-mapping-2&state=6&location=0&breed=0&colour=0&sex=0&name="
    const previousCats = readCatFile();
    const browser = await chromium.launch({headless: true});
    const browserContext = await browser.newContext(devices["Desktop Chrome"]);
    const page = await browserContext.newPage();
    //get the browser to load all the cats onto the page
    await page.goto(searchUrl);
    await page.waitForTimeout(6000);
    await page.getByText("Search more ").click();
    await page.waitForTimeout(10000);
    const cats = page.locator("#pets")
    const data = [];
    //grab all the cats once they have loaded in
    const catContainers = await cats.locator('[class="pet row-5"]').all();
    for (const cat of catContainers) {
        const href = await cat.locator("a").getAttribute("href")
        //skip seen cats
        if ((href === null) || (previousCats.includes(href))) continue;
        const catName = await cat.locator("h3").innerText();
        //notify new cats
        await fetch('https://ntfy.sh/rspcawa-cat-acquisition-tool', {
            method: 'POST',
            body: `${catName.split(" ")[0]} is now available. Check this link: ${href}`,
            headers: {
                'Title': 'New cat found!',
                'Tags': 'heart_eyes_cat',
                'Priority': 'high'
            }
        })
        writeFileSync("./cats.txt", href + "\n", {flag: "a"});

    }
        //finish
    console.log(`Scrape completed ${new Date()}`)
    await browser.close();
};

//Schedule a recurring task every 5m to run the scraper

const scheduler = new ToadScheduler();
const task = new AsyncTask('cat scraping',
    catScraper,
    async (err: Error) => {
        await fetch('https://ntfy.sh/rspcawa-cat-acquisition-tool', {
            method: 'POST',
            body: `Error: ${err}`,
            headers: {
                'Title': 'Error in cat scraper!',
                'Tags': 'scream_cat',
                'Priority': 'high'
            }
        })
        scheduler.stop();
        process.exit(1);
        });
const job = new SimpleIntervalJob(
    {minutes: 5},
    task,
    {id: 'id_1', preventOverrun: true}
)

scheduler.addSimpleIntervalJob(job);

//keep the process running
setInterval(() => {}, 1 << 30);
