/* eslint-disable */

import get from 'lodash.get'

export * from './lib/api.js'

export function parseResponse (responseBody) {
  return responseBody.split(/\d{2,10};(?={.+})/)
    .filter(s => s.length)
    .map(t => JSON.parse(t))
}

export function getWorksheetsCmdResponse (selectApiResponse, workbook) {
  const presModel = get(selectApiResponse, 'vqlCmdResponse.layoutStatus.applicationPresModel')
  let zonesWithWorksheet = worksheetCmdResponseList(presModel)

  if (!zonesWithWorksheet.length) {
    zonesWithWorksheet = storyPointsCmdResponseList(presModel)
  }

  const newDataSegments = get(presModel, 'dataDictionary.dataSegments')
  getDataValues(workbook.dataValues, newDataSegments)

  const worksheets = zonesWithWorksheet.reduce((arr, selectedZone) => {
    const data = getWorksheetCmdResponse(selectedZone, workbook.dataValues)

    if (data) {
      arr.push(data)
    }

    return arr
  }, [])

  return worksheets
}

export function getWorksheet (worksheetName, workbook) {
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

export function getDataValues (dataValues, newDataSegments) {
  if (!newDataSegments) return dataValues

  for (const segment of Object.values(newDataSegments)) {
    for (const column of segment.dataColumns) {
      if (!dataValues[column.dataType]) {
        dataValues[column.dataType] = column.dataValues
      } else {
        dataValues[column.dataType].push(...column.dataValues)
      }
    }
  }

  return dataValues
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

export function worksheetCmdResponseList (presModel) {
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

export function storyPointsCmdResponseList (presModel) {
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
