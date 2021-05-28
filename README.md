# scrape-tableau

> Get data from tableau dashboards

## Why
It would be best if this library weren't necessary.

If you publish data visualizations through tableau and you aren't allowing the data to be downloaded in some way (like, the integrated data download button), please reflect on why you're doing that. It's always possible to get the data, and obfuscating it just makes it more likely that errors will be introduced in the data in the scraping process.

## Current status
This is a collection of functions that can be used to parse tableau http responses and from those piece together the data powering a vizualization.

Right now there are a few use cases this library supports:

- getting inital data from a workbook
- parsing data returned from making selections in a worksheet
- using with node.js http requests via [got](https://npmjs.com/got) (responses can sometimes be unreliable)
- using with [playwright](https://npmjs.com/playwright) (more reliable responses, bigger dependency/more complexity)

> Sidenote: the challenges with getting unhelpful responses via node.js http requests may actually have to do with responses being server rendered. I haven't dug into that too much because the approach using playwright is working just fine.

There are a number of additions that can be made:

- Filters
- Parameters
- Other things I'm not thinking of right now

## Examples

See the examples to get an idea about usage.

### Usage with playwright
- [Getting data for a set of selections in a worksheet](examples/playwright/select.js)

## See also
- [TableauScraper](https://github.com/bertrandmartel/tableau-scraping) - an awesome python project that this was heavily based on by [@bertrandmartel](https://github.com/bertrandmartel)
- [Reverse-Engineering a Tableau Dashboard Feed](https://observablehq.com/@rdmurphy/reverse-engineering-a-tableau-dashboard-feed) A really great notebook by [@rdmurphy](https://github.com/rdmurphy) outlining the general approach to getting data out of a dashboard
