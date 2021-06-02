import * as fs from 'fs/promises'
import * as dirname from 'desm'
import { ApiClient } from "../../lib/api.js"
import { createWorkbook, updateWorkbook, getWorksheet, getWorksheetNames, getDataValues, getSelectableItems } from "../../index.js"

async function main () {
  const api = new ApiClient({
    url: 'https://dashboards.doh.nj.gov/views/DailyConfirmedCaseSummary7_22_2020/ConfirmedCases'
  })

  const config = await api.config()
  console.log('config', config)
  const json = await api.bootstrap()
  await fs.writeFile(dirname.join(import.meta.url, 'bootstrap.json'), JSON.stringify(json, null, 2))
  const workbook = createWorkbook(json)
  // console.log(workbook)

  // const worksheet = getWorksheet(workbook, 'COUNTY BAR CHART')
  // console.log(worksheet)
  const selectableItems = getSelectableItems(workbook, 'COUNTY BAR CHART')
  for (const item of selectableItems) {
    console.log(item)
    const response = await api.select({
      sheetName: workbook.info.sheetName,
      worksheetName: 'COUNTY BAR CHART',
      selections: ['ESSEX']
    })

    console.log('hello', response.vqlCmdResponse.cmdResultList[0])
    const updatedWorkbook = updateWorkbook(workbook, response)
    console.log(updatedWorkbook)
  }
}

main()
