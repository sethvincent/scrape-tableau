/* eslint-disable camelcase */

import FormData from 'form-data'
import got from 'got'
import * as cheerio from 'cheerio'

import { CookieJar } from 'tough-cookie'

export class ApiClient {
  constructor (config = {}) {
    const { url, clientRender = true } = config

    this.clientRender = clientRender
    this.url = url
    this.parsedUrl = new URL(url)
    this.cookies = new CookieJar()
    this.tableauConfig = null
  }

  async request (url, options = {}) {
    return got(url, {
      ...options,
      cookieJar: this.cookies
    })
  }

  async config () {
    const url = `${this.url}?:embed=y&:showVizHome=no${this.clientRender ? '&:render=true' : ''}`
    const response = await this.request(url)

    const $ = cheerio.load(response.body)
    const text = $('#tsConfigContainer').text()
    const json = JSON.parse(text)
    this.tableauConfig = json
    return json
  }

  // https://dashboards.doh.nj.gov/vizql/w/DailyConfirmedCaseSummary7_22_2020/v/Deaths/bootstrapSession/sessions
  async bootstrap () {
    const { origin } = this.parsedUrl
    const { vizql_root, sessionid } = this.tableauConfig

    const url = `${origin}${vizql_root}/bootstrapSession/sessions/${sessionid}`

    const form = new FormData()
    form.append('sheet_id', this.tableauConfig.sheetId)

    const response = await this.request(url, {
      body: form,
      method: 'POST'
    })

    return parsePrefixedResponse(response.body)
  }

  async select (options = {}) {
    const { sheetName, worksheetName, selections } = options

    const { origin } = this.parsedUrl
    const { vizql_root, sessionid } = this.tableauConfig

    const selectEndpoint = this.clientRender ? 'select-region-no-return-server' : 'select'

    const url = `${origin}${vizql_root}/sessions/${sessionid}/commands/tabsrv/${selectEndpoint}`
    console.log('url', url)
    const selection = JSON.stringify({ objectIds: [22], selectionType: 'tuples' })

    const form = new FormData()
    form.append('worksheet', worksheetName)
    form.append('dashboard', sheetName)
    form.append('selection', selection)
    form.append('selectOptions', 'selection')

    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'content-type': `multipart/form-data; boundary=${form.getBoundary()}`
      },
      body: form
    })

    return JSON.parse(response.body)
  }
}

export function parsePrefixedResponse (responseBody) {
  return responseBody.split(/\d{2,10};(?={.+})/)
    .filter(s => s.length)
    .map(t => JSON.parse(t))
}
