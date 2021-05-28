/* eslint-disable camelcase */

import FormData from 'form-data'
import got from 'got'
import * as cheerio from 'cheerio'

import { CookieJar } from 'tough-cookie'

export class ApiClient {
  constructor (config = {}) {
    const { url, tableauConfig } = config
    this.url = url
    this.parsedUrl = new URL(url)
    this.cookies = new CookieJar()
    this.tableauConfig = tableauConfig
  }

  async request (url, options = {}) {
    return got(url, {
      ...options,
      cookieJar: this.cookies
    })
  }

  async config () {
    const url = `${this.url}?:embed=y&:showVizHome=no`
    const response = await this.request(url)

    const $ = cheerio.load(response.body)
    const text = $('#tsConfigContainer').text()
    const json = JSON.parse(text)
    return json
  }

  async select (options = {}) {
    const { sheetName, worksheetName, selections } = options

    const { origin } = this.parsedUrl
    const { vizql_root, sessionid } = this.tableauConfig

    const url = `${origin}${vizql_root}/sessions/${sessionid}/commands/tabdoc/select`
    const selection = JSON.stringify({ objectIds: selections, selectionType: 'tuples' })

    const form = new FormData()
    form.append('worksheet', worksheetName)
    form.append('dashboard', sheetName)
    form.append('selection', selection)
    form.append('selectOptions', 'select-options-simple')

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
