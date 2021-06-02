import get from 'lodash.get'
import clone from 'lodash.clonedeep'

export * from './lib/api.js'

class Workbook {
  constructor (config = {}) {

  }

  getWorksheetNames () {

  }

  getWorksheets () {

  }

  getSelectableItems () {

  }

  getSelectableValues () {

  }
}

export function createWorkbook (bootstrapResponse) {
  const [info, data] = bootstrapResponse
  const dataSegments = get(data, 'secondaryInfo.presModelMap.dataDictionary.presModelHolder.genDataDictionaryPresModel.dataSegments')

  const workbook = {
    info,
    data,
    dataSegments,
    dataValues: {},
    worksheetNames: [],
    worksheets: {},
    selectableItems: null,
    selectableValues: null
  }

  getDataValues(workbook)
  workbook.worksheetNames = getWorksheetNames(workbook)
  workbook.worksheets = getWorksheets(workbook)

  return workbook
}

function worksheetList (presModelMap) {
  return Object.keys(get(presModelMap, 'vizData.presModelHolder.genPresModelMapPresModel.presModelMap'))
}

export function getWorksheetNames (workbook) {
  // TODO: command response variation
  // if (this.cmdResponse) {
  //   const presModel = get(this.originalData, 'vqlCmdResponse.layoutStatus.applicationPresModel')
  //   return worksheetInfoList(presModel).map((item) => {
  //     return item.worksheet
  //   })
  // } else {
    let presModel = getPresModelVizData(workbook.data)

    if (presModel) {
      return worksheetList(presModel)
    }

    presModel = getPresModelVizInfo(workbook.info)

    const worksheets = worksheetInfoList(presModel)

    if (!worksheets.length) {
      // TODO: check story points for worksheet names
      // return this.listStoryPointsInfo(presModel)
      return []
    }

    return worksheets
  // }
}

export function getWorksheets (workbook) {
  return workbook.worksheetNames.reduce((obj, name) => {
    obj[name] = getWorksheet(workbook, name)
    return obj
  }, {})
}

export function getWorksheetsCmdResponse (selectApiResponse, workbook) {
  const presModel = get(selectApiResponse, 'vqlCmdResponse.layoutStatus.applicationPresModel')
  let zonesWithWorksheet = worksheetCmdResponseList(presModel)

  if (!zonesWithWorksheet.length) {
    zonesWithWorksheet = storyPointsCmdResponseList(presModel)
  }

  const newDataSegments = get(presModel, 'dataDictionary.dataSegments')
  getDataValues(workbook, newDataSegments)

  const worksheets = zonesWithWorksheet.reduce((arr, selectedZone) => {
    const data = getWorksheetCmdResponse(selectedZone, workbook.dataValues)

    if (data) {
      arr.push(data)
    }

    return arr
  }, [])

  return worksheets
}

export function updateWorkbook (workbook, commandApiResponse) {
  const presModel = getApplicationPresModel(commandApiResponse)
  const newWorkbook = clone(workbook)
  updateDataSegments(newWorkbook, presModel)
  getDataValues(newWorkbook)
  newWorkbook.worksheetNames = getWorksheetNames(newWorkbook)
  newWorkbook.worksheets = updateWorksheets(newWorkbook, presModel)
  return newWorkbook
}

export function getApplicationPresModel (apiResponse) {
  return get(apiResponse, 'vqlCmdResponse.layoutStatus.applicationPresModel')
}

export function updateWorksheets (workbook, presModel) {
  let zonesWithWorksheet = getZonesFromVizData(presModel)

  if (!zonesWithWorksheet.length) {
    zonesWithWorksheet = getZonesFromStoryPoints(presModel)
  }

  const newDataSegments = get(presModel, 'dataDictionary.dataSegments')
  getDataValues(workbook, newDataSegments)

  console.log('zonesWithWorksheet', zonesWithWorksheet)
  const worksheets = zonesWithWorksheet.reduce((arr, selectedZone) => {
    const data = getWorksheetCmdResponse(selectedZone, workbook.dataValues)

    if (data) {
      arr.push(data)
    }

    return arr
  }, [])

  return worksheets
}

export function getWorksheet (workbook, worksheetName) {
  let presModelMap = getPresModelVizData(workbook.data)

  let indicesInfo
  if (presModelMap) {
    indicesInfo = getIndicesInfo(presModelMap, worksheetName)
  } else {
    presModelMap = getPresModelVizInfo(workbook.info)
    indicesInfo = getIndicesInfoStoryPoint(presModelMap, worksheetName)

    if (!presModelMap.dataDictionary) {
      presModelMap = getPresModelVizDataWithoutViz(workbook.data)
    }
  }

  return getData(workbook.dataValues, indicesInfo)
}

export function getSelectableItems (workbook, worksheetName) {
  // if (this.cmdResponse) {
  //   const presModel = get(this.scraper.originalData, 'vqlCmdResponse.layoutStatus.applicationPresModel')

  //   return getIndicesInfoVqlResponse(presModel, this.worksheetName).map((item) => {
  //     const values = Object.values(getData(this.dataSegments, [item]))[0]

  //     return {
  //       column: item.fieldCaption,
  //       values
  //     }
  //   })
  // } else {
    let presModel = getPresModelVizData(workbook.data)
    let indicesInfo

    if (!presModel) {
      presModel = getPresModelVizInfo(workbook.info)
      indicesInfo = getIndicesInfoStoryPoint(presModel, worksheetName)
    } else {
      indicesInfo = getIndicesInfo(presModel, worksheetName)
    }
    return indicesInfo.map((index) => {
      const values = getData(workbook.dataValues, [index])

      return {
        column: index.fieldCaption,
        values
      }
    })
  // }
}

export function updateDataSegments (workbook, presModel) {
  if (presModel.dataDictionary) {
    const dataSegments = presModel.dataDictionary.dataSegments
    const keys = Object.keys(dataSegments)

    for (const key of keys) {
      workbook.dataSegments[key] = dataSegments[key]
    }
  }
}

export function getDataSegments (workbook, presModelMap) {
  let dataSegments = {}

  if (presModelMap.dataDictionary && presModelMap.dataDictionary.presModelHolder) {
    dataSegments = get(presModelMap, 'dataDictionary.presModelHolder.genDataDictionaryPresModel.dataSegments')
  }

  const dataSegmentsCopy = clone(dataSegments)
  const originSegmentsCopy = clone(workbook.dataSegments)

  let dataColumns = []

  for (const [key, segment] of Object.entries(originSegmentsCopy)) {
    dataColumns = [
      ...dataColumns,
      ...segment.dataColumns
    ]
  }

  for (const [key, segment] of Object.entries(dataSegmentsCopy)) {
    if (!originSegmentsCopy[key]) {
      dataColumns = [
        dataColumns,
        ...segment.dataColumns
      ]
    }
  }

  const data = {}

  for (const column of dataColumns) {
    if (data[column.dataType]) {
      data[column.dataType] = [
        ...data[column.dataType],
        ...column.dataValues
      ]
    } else {
      data[column.dataType] = column.dataValues
    }
  }

  return data
}

export function getDataValues (workbook, newDataSegments) {
  if (!newDataSegments) {
    newDataSegments = workbook.dataSegments
  }

  for (const segment of Object.values(newDataSegments)) {
    for (const column of segment.dataColumns) {
      if (!workbook.dataValues[column.dataType]) {
        workbook.dataValues[column.dataType] = column.dataValues
      } else {
        workbook.dataValues[column.dataType].push(...column.dataValues)
      }
    }
  }

  return workbook.dataValues
}

export function getData (dataValues, indicesInfo) {
  let cstring
  if (dataValues.cstring) {
    cstring = dataValues.cstring
  } else {
    cstring = {}
  }

  const data = {}

  for (const index of indicesInfo) {
    if (dataValues[index.dataType]) {
      const dataType = dataValues[index.dataType]

      if (index.valueIndices.length) {
        data[`${index.fieldCaption}-value`] = index.valueIndices.map((idx) => {
          return onDataValue(idx, dataType, cstring, index.dataType)
        })
      }

      if (index.aliasIndices.length) {
        data[`${index.fieldCaption}-alias`] = index.aliasIndices.map((idx) => {
          return onDataValue(idx, dataType, cstring, index.dataType)
        })
      }
    } else {
      const dataType = cstring

      if (index.valueIndices && index.valueIndices.length) {
        data[`${index.fieldCaption}-value`] = index.valueIndices.map((idx) => {
          return onDataValue(idx, dataType, cstring, index.dataType)
        })
      }

      if (index.aliasIndices && index.aliasIndices.length) {
        data[`${index.fieldCaption}-alias`] = index.aliasIndices.map((idx) => {
          return onDataValue(idx, dataType, cstring, index.dataType)
        })
      }
    }
  }

  return data
}

function onDataValue (index, dataType, cstring, wut) {
  if (index >= 0) {
    return dataType[index]
  } else {
    return cstring[Math.abs(index) - 1]
  }
}

export function getPresModelVizData (data) {
  if (get(data, 'secondaryInfo.presModelMap.vizData')) {
    return get(data, 'secondaryInfo.presModelMap')
  }

  return null
}

export function getPresModelVizInfo (info) {
  if (get(info, 'worldUpdate.applicationPresModel.workbookPresModel')) {
    return get(info, 'worldUpdate.applicationPresModel')
  }

  return null
}

export function getPresModelVizDataWithoutViz (data) {
  if (get(data, 'secondaryInfo.presModelMap')) {
    return get(data, 'secondaryInfo.presModelMap')
  }

  return null
}

export function getIndicesInfo (presModel, worksheetName, options = {}) {
  const { noSelectFilter = true, noFieldCaption = false } = options
  const genVizDataPresModel = get(presModel, `vizData.presModelHolder.genPresModelMapPresModel.presModelMap.${worksheetName}.presModelHolder.genVizDataPresModel`)

  if (!genVizDataPresModel || !genVizDataPresModel.paneColumnsData) {
    return []
  }

  const columnsData = genVizDataPresModel.paneColumnsData

  return columnsData.vizDataColumns.reduce((arr, column, i) => {
    if ((column.fieldCaption || noFieldCaption) && (noSelectFilter || column.isAutoSelect === true)) {
      const paneIndice = column.paneIndices[0]
      const columnIndice = column.columnIndices[0]

      arr.push({
        fieldCaption: column.fieldCaption || '',
        tupleIds: get(columnsData, `paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.tupleIds`),
        valueIndices: get(columnsData, `paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.valueIndices`),
        aliasIndices: get(columnsData, `paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.aliasIndices`),
        dataType: column.dataType || '',
        paneIndices: paneIndice,
        columnIndices: columnIndice,
        fn: column.fn || ''
      })
    }

    return arr
  }, [])
}

export function getZonesFromVizData (presModel) {
  console.log('getZonesFromVizData', presModel)
  const zones = get(presModel, 'workbookPresModel.dashboardPresModel.zones')
  const zoneKeys = Object.keys(zones)
  return zoneKeys.reduce((arr, key) => {
    const zone = zones[key]

    if (get(zone, 'worksheet') && get(zone, 'presModelHolder.visual.vizData')) {
      arr.push(zone)
    }

    return arr
  }, [])
}

export function getZonesFromStoryPoints (presModel) {
  const zones = get(presModel, 'workbookPresModel.dashboardPresModel.zones')

  const storyPoints = Object.keys(zones).reduce((arr, key) => {
    const zone = zones[key]
    const zoneStoryPoints = get(zone, 'presModelHolder.flipboard.storyPoints')

    if (zoneStoryPoints) {
      arr.push(zoneStoryPoints)
    }

    return arr
  }, [])

  const stories = []

  if (!storyPoints.length) {
    return stories
  }

  const storyPoint = storyPoints[0]
  const keys = Object.keys(storyPoint)

  if (keys.length) {
    const storyPointZones = get(storyPoint[keys[0]], 'dashboardPresModel.zones')
    Object.keys(storyPointZones).reduce((arr, key) => {
      const zone = storyPointZones[key]

      if (get(zone, 'worksheet') && get(zone, 'presModelHolder.visual.vizData')) {
        arr.push(zone)
      }

      return arr
    }, stories)
  }

  return stories
}

export function getIndicesInfoStoryPoint (presModel, worksheetName, options = {}) {
  const { noSelectFilter = true, noFieldCaption = false } = options

  const zonesWithWorksheet = worksheetStoryPointList(presModel)

  const selectedZone = zonesWithWorksheet.find((zone) => {
    return zone.worksheet === worksheetName
  })

  if (!selectedZone) {
    return []
  }

  const details = get(selectedZone, 'presModelHolder.visual.vizData')

  if (!details.paneColumnsData) {
    return []
  }

  const columnsData = details.paneColumnsData

  return columnsData.vizDataColumns.map((arr, column) => {
    if ((column.fieldCaption || noFieldCaption) && (noSelectFilter || column.isAutoSelect === true)) {
      const paneIndice = column.paneIndices[0]
      const columnIndice = column.columnIndices[0]

      arr.push({
        fieldCaption: column.fieldCaption || '',
        tupleIds: get(columnsData`paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.tupleIds`),
        valueIndices: get(columnsData`paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.valueIndices`),
        aliasIndices: get(columnsData`paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.aliasIndices`),
        dataType: column.dataType || '',
        paneIndices: paneIndice,
        columnIndices: columnIndice,
        fn: column.fn || ''
      })
    }

    return arr
  }, [])
}

export function worksheetStoryPointList (presModel, options = {}) {
  const { hasWorksheet = true } = options

  const zones = get(presModel, 'workbookPresModel.dashboardPresModel.zones')

  const storyPoints = Object.keys(zones).reduce((arr, key) => {
    const zone = zones[key]

    if (get(zone, 'presModelHolder.flipboard.storyPoints')) {
      arr.push(get(zone, 'presModelHolder.flipboard.storyPoints'))
    }

    return arr
  }, [])

  const stories = []

  if (!storyPoints.length) {
    return stories
  }

  const storyPoint = storyPoints[0]
  const keys = Object.keys(storyPoint)

  if (keys.length) {
    const storyPointZones = get(storyPoint[keys[0]], 'dashboardPresModel.zones')

    if (hasWorksheet) {
      Object.keys(storyPointZones).reduce((arr, key) => {
        const zone = storyPointZones[key]

        if (get(zone, 'worksheet') && get(zone, 'presModelHolder.visual.vizData')) {
          arr.push(zone)
        }

        return arr
      }, stories)
    } else {
      Object.keys(storyPointZones).reduce((arr, key) => {
        const zone = storyPointZones[key]

        if (zone.presModelHolder) {
          arr.push(zone)
        }

        return arr
      }, stories)
    }
  }

  return stories
}

export function getWorksheetCmdResponse (selectedZone, dataSegments, options = {}) {
  const { noSelectFilter = true, noFieldCaption = false } = options

  const details = get(selectedZone, 'presModelHolder.visual.vizData')

  if (!details.paneColumnsData) {
    return
  }

  const columnsData = details.paneColumnsData

  const result = columnsData.vizDataColumns.reduce((arr, column) => {
    if ((column.fieldCaption || noFieldCaption) && (noSelectFilter || column.isAutoSelect === true)) {
      const paneIndice = column.paneIndices[0]
      const columnIndice = column.columnIndices[0]

      arr.push({
        fieldCaption: column.fieldCaption || '',
        valueIndices: get(columnsData, `paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.valueIndices`),
        aliasIndices: get(columnsData, `paneColumnsList.${paneIndice}.vizPaneColumns.${columnIndice}.aliasIndices`),
        dataType: column.dataType || '',
        paneIndices: paneIndice,
        columnIndices: columnIndice
      })
    }

    return arr
  }, [])

  return getData(dataSegments, result)
}
