import * as fs from 'fs/promises'
import * as dirname from 'desm'

import { chromium } from 'playwright'
import get from 'lodash.get'

import { parsePrefixedResponse, getDataValues, getWorksheet, getWorksheetsCmdResponse } from '../../index.js'

const counties = [
  'bergen',
  'middlesex',
  'essex',
  'hudson',
  'monmouth',
  'ocean',
  'passaic',
  'union',
  'camden',
  'morris',
  'burlington',
  'mercer',
  'gloucester',
  'atlantic',
  'somerset',
  'cumberland',
  'sussex',
  'warren',
  'hunterdon',
  'salem',
  'cape-may',
  'unknown'
]

const dashboardUrl = 'https://dashboards.doh.nj.gov/views/DailyConfirmedCaseSummary7_22_2020/ConfirmedCases?:render=true'
let currentCounty

async function main () {
  const browser = await chromium.launch({
    headless: true
  })

  const context = await browser.newContext({
    viewport: {
      width: 600,
      height: 1200
    }
  })

  const page = await context.newPage()

  const workbook = {
    info: null,
    data: null,
    dataSegments: {},
    dataValues: {},
    worksheets: []
  }

  async function downloadWorksheets () {
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('bootstrap')) {
        const body = await response.body()
        const [info, data] = parsePrefixedResponse(body.toString())

        workbook.info = info
        workbook.data = data
        workbook.dataSegments = get(data, 'secondaryInfo.presModelMap.dataDictionary.presModelHolder.genDataDictionaryPresModel.dataSegments')
        getDataValues(workbook, workbook.dataSegments)
        const ws = getWorksheet(workbook, 'Cases by Onset')
        const filepath = dirname.join(import.meta.url, 'downloads', 'new-jersey.json')
        await fs.writeFile(filepath, JSON.stringify(ws, null, 2))
      }

      if (url.includes('select')) {
        console.log('select url', url)
        const body = await response.body()
        const json = JSON.parse(body.toString())
        // const worksheets = getWorksheetsCmdResponse(workbook, json)
        // console.log('downloading county', currentCounty)
        // const filepath = dirname.join(import.meta.url, 'downloads', `${currentCounty}.json`)
        // await fs.writeFile(filepath, JSON.stringify(worksheets, null, 2))
      }
    })

    await page.goto(dashboardUrl)

    for (let i = 1; i <= 22; i++) {
      currentCounty = counties[i - 1]
      await page.mouse.click(20, 215 + (i * 29))
      await page.waitForTimeout(3000)
    }
  }

  await downloadWorksheets()
  // await browser.close()
}

main()
