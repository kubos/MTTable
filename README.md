# MTTable

A reusable React Apollo Material UI table component.

# Introduction

The purpose of the `<MTTable>` component is to abstract the details of sorting, pagination, row selection, URL persistence of sort/filter parameters, and various types of column filtering into a reusable component. The component will render:

* The header row (including filter menu icons and sort direction indicators, etc.)
* Beneath the header row, a list of currently active filters (aka "filter pills")
* Below the table data, the pagination controls

The component does NOT have any opinion about how the rows of data are displayed. The user of the component simply passes a renderRows callback which receives the table data and returns JSX to show the content of the table.

The following types of column filtering are supported:

* searchable list of options driven by a GraphQL query
* fixed list of options
* date/time filtering

The goal is that if you want to add a new table view, all you need to do is pass a list of configuration objects (one for each column) that defines the sorting/filtering behavior for that column, then write your renderRows implementation to define the appearance of the body of the table. The rest should be handled by the MTTable component!

Currently, the table must be backed by either a GraphQL query used to fetch data, or an array of objects. It is also assumed that GraphQL queries use consistent naming for these input variables:

* `$first` and `$after` for pagination
* `$filters`: an object passed to filter the results of this query. The exact contents of this depend on what is required by the backend for that particular query
* `$orderBy`: an object that will have properties `sort` and `direction`, for sorting

Note: there are two flavors of GraphQL queries happening within the `<MTTable>` component:

1) The main query to fetch data to populate the table. This is passed as the `query` prop to `<MTTable>`.
2) Any column with a searchable list of filter options requires its own GraphQL query in order to fetch the list of options. This is passed as `typeaheadQueryOptions.query`

Many of the configuration options below are related to telling the `<MTTable>` exactly how to build the GraphQL variables to filter the results correctly.

# Component API

## `<MTTable>`

|property                               |type                                                                    |required?                                                                    |description                                                                                                                                                           |
|---------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|columnGroups                           |array of `columnGroup`s                                                   |required                                                                     |Defines the set of columns and all options for each column                                                                                                            |
|renderRows                             |callback that takes the GraphQL query result data object and returns JSX|required                                                                     |Rendering the data rows is left up to the user. The component simply passes back the GraphQL result object to this callback and then renders the result of the callback.|
|query                                  |GraphQL query                                                           |required if `dataArray` not specified                                          |GraphQL query that will fetch data to populate this table                                                                                                       |
|dataPath                               |string                                                                  |required if query is specified                                               |Path within the GraphQL query result object to the data for this table. Used to get pagination info. Example: "system.stagedFiles"                                    |
|dataArray                              |array of objects                                                        |required if `query` not specified                                            |Table will be backed by this array instead of a GraphQL query                                                                                                        |
|doFilterAndSort                        |callback that takes a data array and GraphQL variables-like object and returns a filtered/sorted array |required if `dataArray` is specified                            |Apply filter and sort parameters to the array of data                                                                                                      |
|variables                              |object                                                                  |optional                                                                     |Will be merged with variables object sent to GraphQL query                                                                                                            |
|pollInterval                           |number                                                                  |optional. Default: 0 (polling disabled)                                      |How often the GraphQL query will poll. Set to 0 to disable polling                                                                                                    |
|defaultSortKey                         |string                                                                  |optional                                                                     |This value will be sent to the table's GraphQL query as `orderBy.sort` if the user has not yet clicked on a column to make it sorted.                                 |
|defaultSortDirection                   |string ("ASC" or default "DESC")                                        |optional                                                                     |This value will be sent to the table's GraphQL query as `orderBy.direction` if the user has not yet clicked on a column to make it sorted.                            |
|customClasses                          |classes object provided by `withStyles`                                 |optional                                                                     |Allows you to override specific styles within the MTTable component. Currently the overridable classes are `pillWrapper`, `headerContainer`, and `noData`             |
|onCompleted                            |callback                                                                |optional                                                                     |Callback that gets passed to react-apollo `<Query>`'s `onCompleted`                                                                                                   |
|onHandleFilter                         |callback                                                                |optional                                                                     |Callback that gets passed the `MTTable`'s internal `filters` object so that you can set column props depending on current state of user filters                       |
|HeaderContainer                        |React component                                                         |optional                                                                     |Override the container component used to render the table header row                                                                                                  |
|FilterPillContainer                    |React component                                                         |optional                                                                     |Override the container component used to render the filter pill row                                                                                                   |
|renderFilterPillsOutsideHeaderContainer|boolean                                                                 |optional. Default: false                                                     |If true, put the `FilterPillContainer` after the `HeaderContainer` instead of inside it at the end                                                                    |
|disablePaginationIfRowCountUnder       |number                                                                  |optional. Default: Pagination always enabled                                 |Only show pagination controls if row count is >= this threshold                                                                                                       |
|noDataText                             |string                                                                  |optional                                                                     |Placeholder text if the query returns no data                                                                                                       |
|renderHeaderIfNoData                   |boolean                                                                 |optional. default: false                                                     |Whether to render the header if the query returns no data                                                                                                       |

## `columnGroups`

Array of `columnGroup` objects. The sum of all columnGroup widths should add up to 12 for a full-width table. The need to group columns into columnGroups is purely for layout reasons. This allows the header column widths to match the rows rendered by the user of this component.

## `columnGroup`

Columns can be grouped together to achieve the desired spacing of columns. The sum of all column widths within the group should add up to 12.

|property                               |type                                                                    |required?                                                                    |description                                                                                                                                                           |
|---------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|width                                  |number                                                                  |required                                                                     |Width of `Grid` component containing this group of columns                                                                                                            |
|columns                                |array of `column` objects                                               |required                                                                     |List of columns in table                                                                                                                                              |

## `column`

Specify all options to determine the behavior of this `column`, including sorting and filtering.

|property                               |type                                                                    |required?                                                                    |description                                                                                                                                                           |
|---------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|name                                   |string                                                                  |required                                                                     |label for the column header                                                                                                                                           |
|width                                  |number                                                                  |required                                                                     |Width of the `Grid` component for this column                                                                                                                         |
|customTooltip                          |string                                                                  |optional                                                                     |specify custom tooltip. Causes question mark icon next to column header text                                                                                          |
|bold                                   |boolean                                                                 |optional. default: false                                                     |Make the column header text bold                                                                                                                                      |
|type                                   |string, must be "SELECT_ALL" if specified                               |(only specify if your table has selectable rows)                             |Column header will be a checkbox that allows you to select/deselect all rows                                                                                          |
|containerClass                         |class value provided by withStyles                                      |optional                                                                     |Override the container styling for the column header cell                                                                                                             |
|sortKey                                |string                                                                  |optional                                                                     |Makes column sortable. The value will be sent to the table's graphql query as `orderBy.sort`                                                                          |
|filterOptions                          |`filterOptions` object                                                  |optional                                                                     |Makes column filterable                                                                                                                                               |

## `filterOptions`

Options to define behavior of filtering.

|property                               |type                                                                    |required?                                                                    |description                                                                                                                                                           |
|---------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|rowsQueryFilterKey                     |string                                                                  |required                                                                     |Name of property passed in the `filters` GraphQL variable. The value of the property is determined by the state of the filter for this column                         |
|pillLabel                              |string                                                                  |required unless using `dateTimeFilterOptions`                                |Label for the "pill" rendered beneath the table Header that shows the state of this filter                                                                            |
|menuOptions                            |`menuOptions` object                                                    |required unless using `dateTimeFilterOptions`                                |Define the behavior of the menu that pops up when you click the filter icon                                                                                           |
|rowsQuerySubstringFilterKey            |string                                                                  |optional                                                                     |Name of property passed in the `filters` GraphQL variable if the user hits "enter" on a typeahead menu without selecting a menu option. If not specified, the text field value will be passed to `rowsQueryFilterKey`|

## `menuOptions`

Define the behavior of the menu that pops up when you click the filter icon. The menu can be either a searchable set of options, a fixed set of options, or menu allowing you to set a start/end datetime filter.

|property                               |type                                                                    |required?                                                                    |description                                                                                                                                                           |
|---------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|typeaheadQueryOptions                  |`typeaheadQueryOptions` object                                          |`*`                                                                          |Makes this column filter menu a text-searchable list of options                                                                                                       |
|dateTimeFilterOptions                  |`dateTimeFilterOptions` object                                          |`*`                                                                          |Makes this column filter menu into a start/end date/time filter.                                                                                                      |
|fixedMenuOptions                       |array of strings                                                        |`*`                                                                          |Makes this column filter menu a fixed set of the strings specified in this option. If `noTextSearch` is not set, the list will be automatically be filtered by the user-entered substring|
|nameValueFromNodeArray                 |callback that takes an array of nodes as input and returns an array of objects, each with a `name` and `value` property|required unless this is a date/time filter                                   |Maps the result of the GraphQL query fetching options for this menu to an array of objects with `name` and `value` properties                                         |
|filterOnValue                          |boolean                                                                 |optional. default: true                                                      |If true, the `value` property of the result of `nameValueFromNodeArray` is sent to the `filters` variable of the main GraphQL query fetching data for the table. If false, the `name` property is used|
|noTextSearch                           |boolean                                                                 |optional. default: false                                                     |Don't show the text search field in the filter menu that pops up for this column                                                                                      |
|showAllImmediately                     |boolean                                                                 |optional. default: false                                                     |If true, immediately show the set of options for this filter. If false, options aren't shown until 3 characters have been typed                                       |
|replaceExistingFilter                  |boolean                                                                 |optional. default: false                                                     |If true, only a single filter is allowed for this column. If false, multiple filters can be selected (e.g. show commands with status "completed" OR "failed").        |
|noPartialSearch                        |boolean                                                                 |optional. default: false                                                     |Text field is shown, but user is not allowed to search by substring (hitting "enter" on text field will not do anything)                                                |

`*` one of `typeaheadQueryOptions`, `dateTimeFilterOptions`, or `fixedMenuOptions` is required.

## `typeaheadQueryOptions`

Makes this column filter menu a text-searchable list of options. You must specify the query used to get the list of options and how to filter the query based on the state of the text field.

|property                               |type                                                                    |required?                                                                    |description                                                                                                                                                           |
|---------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|query                                  |GraphQL query                                                           |required                                                                     |GraphQL query to retrieve the set of options to be shown in this Typeahead menu                                                                                       |
|queryFilterKey                         |string                                                                  |required                                                                     |Name of the property passed to the `filters` GraphQL variable used in the GraphQL query that gets options for this Typeahead menu. The value of the property will be determined by user's selection from this column's filter menu.|
|dataPath                               |string                                                                  |required                                                                     |The path in the GraphQL result object to get nodes that define the set of options for this menu. example: "data.mission.systems.edges"                                |
|queryVariables                         |object                                                                  |optional                                                                     |Variables object to be merged into the `filters` variable passed to the GraphQL query that gets options for this menu                                                 |

## `dateTimeFilterOptions`

Makes this column filter menu into a start/end date/time filter.

|property                               |type                                                                    |required?                                                                    |description                                                                                                                                                           |
|---------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|startTimeFilterKey                     |string                                                                  |required                                                                     |Name of the property passed to the `filters` GraphQL variable for the start time filter. The value of the property will be the timestamp defined by the state of this filter. |
|endTimeFilterKey                       |string                                                                  |required                                                                     |As above, for the end time filter                                                                                                                                     |
