import React, { Component, Fragment } from 'react';
import { ApolloConsumer, Query } from 'react-apollo';
import {
  Button,
  Grid,
  TablePagination,
  Checkbox,
  Paper,
  Typography,
  withStyles,
} from '@material-ui/core';
import { Close } from '@material-ui/icons';
import { get } from 'lodash';
import {
  bool,
  func,
  string,
  object,
  number,
  shape,
  oneOf,
  arrayOf,
} from 'prop-types';
import InteractiveColumnHeader from './InteractiveColumnHeader';
import TablePaginationActionsWithFirstPage from './TablePaginationActionsWithFirstPage';
import SelectionRow from './SelectionRow';
import ArrayProvider from './ArrayProvider';

const noDataAfterFiltersText = 'Nothing matches the selected filters.';
const styles = theme => ({
  pillButton: {
    borderRadius: '17px',
    height: 'auto',
    width: 'auto',
    paddingLeft: 15,
    paddingRight: 15,
    marginRight: theme.spacing.unit,
    backgroundColor: theme.palette.background.primary,
  },
  pillButtonClose: {
    marginLeft: 10,
    width: '0.75em',
    height: '0.75em',
  },
});

class MTTable extends Component {
  static propTypes = {
    columnGroups: arrayOf(
      shape({
        width: number.isRequired,
        columns: arrayOf(object).isRequired,
      })
    ).isRequired,
    query: props => {
      if (!props.dataArray && !props.query) {
        return new Error('query is required if dataArray is not defined');
      }
    },
    dataPath: props => {
      if (props.query && !props.dataPath) {
        return new Error('dataPath is required if query is defined');
      }
    },
    variables: object,
    renderRows: func.isRequired,
    pollInterval: number,
    defaultSortKey: string,
    defaultSortDirection: oneOf(['ASC', 'DESC']),
    customClasses: object,
    onCompleted: func,
    onHandleFilter: func,
    HeaderContainer: func,
    FilterPillContainer: func,
    renderFilterPillsOutsideHeaderContainer: bool,
    disablePaginationIfRowCountUnder: number,
    noDataText: string,
    renderHeaderIfNoData: bool,
    dataArray: props => {
      if (!props.dataArray && !props.query) {
        return new Error('dataArray is required if query is not defined');
      }
    },
    doFilterAndSort: props => {
      if (props.dataArray && !props.doFilterAndSort) {
        return new Error('doFilterAndSort is required if dataArray is defined');
      }
    },
  };

  static defaultProps = {
    query: undefined,
    variables: {},
    dataPath: undefined,
    pollInterval: 0,
    defaultSortKey: undefined,
    defaultSortDirection: 'DESC',
    customClasses: {},
    onCompleted: undefined,
    onHandleFilter: undefined,
    HeaderContainer: undefined,
    FilterPillContainer: undefined,
    renderFilterPillsOutsideHeaderContainer: false,
    disablePaginationIfRowCountUnder: 0,
    noDataText: '',
    renderHeaderIfNoData: false,
    dataArray: undefined,
    doFilterAndSort: undefined,
  };

  constructor(props) {
    super(props);

    const state = {
      filters: {},
      rowsPerPage: 10,
      currentPage: 0,
      after: null,
      cursors: {},
      sort: props.defaultSortKey,
      direction: props.defaultSortDirection,
      forcePausePolling: false,
    };
    const params = new URL(window.location.href).searchParams;

    if (params.get('sort')) {
      state.sort = params.get('sort');
    }

    if (params.get('direction')) {
      state.direction = params.get('direction');
    }

    props.columnGroups.forEach(columnGroup => {
      columnGroup.columns.forEach(column => {
        const dateTimeFilterOptions = get(
          column,
          'filterOptions.menuOptions.dateTimeFilterOptions',
          null
        );

        if (dateTimeFilterOptions) {
          ['start', 'end'].forEach(which => {
            const filterKey = dateTimeFilterOptions[`${which}TimeFilterKey`];
            let filter = params.get(filterKey);

            if (filter) {
              try {
                filter = JSON.parse(filter);
              } catch (err) {
                return;
              }

              state.filters[filterKey] = {
                filterKey,
                filterValue: filter.value,
                pillLabel: which === 'start' ? 'After' : 'Before',
                pillValue: filter.name,
                isSingle: true,
              };
            }
          });
        } else {
          const rowsQueryFilterKey = get(
            column,
            'filterOptions.rowsQueryFilterKey',
            null
          );
          const rowsQuerySubstringFilterKey = get(
            column,
            'filterOptions.rowsQuerySubstringFilterKey',
            null
          );
          const keys = [rowsQueryFilterKey, rowsQuerySubstringFilterKey].filter(
            key => key
          );

          keys.forEach(key => {
            let filters = params.get(key);

            if (filters) {
              try {
                filters = JSON.parse(filters);
              } catch (err) {
                return;
              }

              // build object format expected by state.filters back up from
              // name/value in url
              const buildFilter = urlFilter => {
                let pillLabel = get(
                  column,
                  'filterOptions.pillLabel',
                  'Filter'
                );

                if (key === rowsQuerySubstringFilterKey) {
                  pillLabel = `${pillLabel} Contains`;
                }

                return {
                  filterKey: key,
                  filterValue: get(
                    column,
                    'filterOptions.menuOptions.filterOnValue',
                    true
                  )
                    ? urlFilter.value
                    : urlFilter.name,
                  pillLabel,
                  pillValue: urlFilter.name,
                  isSingle: get(
                    column,
                    'filterOptions.menuOptions.replaceExistingFilter',
                    false
                  ),
                };
              };

              if (Array.isArray(filters)) {
                state.filters[key] = filters.map(filter => buildFilter(filter));
              } else {
                state.filters[key] = buildFilter(filters);
              }
            }
          });
        }
      });
    });

    if (props.onHandleFilter) {
      props.onHandleFilter(state.filters);
    }

    this.state = state;
  }

  pageInfo = {};

  pausePolling = () => this.setState({ forcePausePolling: true });
  restartPolling = () => this.setState({ forcePausePolling: false });

  handleFilter = ({
    filterKey,
    filterValue,
    pillLabel,
    pillValue,
    isSingle,
  }) => {
    const { onHandleFilter } = this.props;
    const filterObject = {
      filterKey,
      filterValue,
      pillLabel,
      pillValue,
    };

    this.setState(state => {
      let newFilter = filterObject;

      if (!isSingle) {
        newFilter = state.filters[filterKey]
          ? [...state.filters[filterKey], filterObject]
          : [filterObject];
      }

      const filters = {
        ...state.filters,
        [filterKey]: newFilter,
      };

      if (onHandleFilter) {
        onHandleFilter(filters);
      }

      return {
        filters,
      };
    }, this.persistToUrl);
  };

  clearFilter = (filterKey, filterValue) => {
    const { onHandleFilter } = this.props;

    this.setState(state => {
      const filters = {
        ...state.filters,
      };

      if (filters[filterKey]) {
        if (Array.isArray(filters[filterKey])) {
          const index = filters[filterKey].findIndex(
            obj => obj.filterValue === filterValue
          );

          if (index >= 0) {
            filters[filterKey].splice(index, 1);
          }

          if (filters[filterKey].length === 0) {
            delete filters[filterKey];
          }
        } else {
          delete filters[filterKey];
        }
      }

      if (onHandleFilter) {
        onHandleFilter(filters);
      }

      return {
        filters,
      };
    }, this.persistToUrl);
  };

  clearAllFilters = () => {
    this.setState(
      {
        filters: {},
      },
      this.persistToUrl
    );
  };

  renderFilterPills = () => {
    const { classes, customClasses } = this.props;
    const { filters } = this.state;

    if (Object.keys(filters).length === 0) {
      return null;
    }

    const pills = Object.keys(filters)
      .map(filterKey => {
        const filterObjects = Array.isArray(filters[filterKey])
          ? filters[filterKey]
          : [filters[filterKey]];

        return filterObjects.map(obj => {
          return (
            <Button
              size="small"
              color="primary"
              variant="fab"
              key={`filter-pill-${obj.filterKey}-${obj.filterValue}`}
              className={classes.pillButton}
              onClick={() => this.clearFilter(obj.filterKey, obj.filterValue)}
            >
              {obj.pillLabel}: {obj.pillValue}
              <Close className={classes.pillButtonClose} />
            </Button>
          );
        });
      })
      .flat();

    return (
      <Grid
        container
        className={customClasses.pillWrapper}
        alignItems="flex-start"
        justify="flex-start"
      >
        {pills}
        {pills.length > 1 && (
          <Button
            size="small"
            color="primary"
            variant="fab"
            key="clear-all-filters"
            className={classes.pillButton}
            onClick={() => this.clearAllFilters()}
          >
            Clear All Filters
          </Button>
        )}
      </Grid>
    );
  };

  getVariables = () => {
    const { after, rowsPerPage, sort, direction } = this.state;
    // pull the filterValue out of each filter object to pass directly into query:
    const stateFilters = Object.fromEntries(
      Object.keys(this.state.filters).map(key => [
        key,
        Array.isArray(this.state.filters[key])
          ? this.state.filters[key].map(f => f.filterValue)
          : this.state.filters[key].filterValue,
      ])
    );
    const orderBy = {
      orderBy: { sort, direction },
    };

    return {
      ...this.props.variables,
      filters: {
        ...this.props.variables.filters,
        ...stateFilters,
      },
      after,
      first: rowsPerPage,
      ...orderBy,
    };
  };

  handleChangePage = (e, page) => {
    const { currentPage } = this.state;
    const nextState = {
      currentPage: page,
      after:
        page > currentPage ? this.pageInfo.endCursor : this.state.cursors[page],
    };
    const cursors = { ...this.state.cursors };

    if (page > currentPage) {
      cursors[page] = this.pageInfo.endCursor;
    }

    this.setState({ ...nextState, cursors });
  };

  handleChangeRowsPerPage = e => {
    this.setState({ rowsPerPage: e.target.value });
  };

  handleSort = newSort => {
    const { sort, direction } = this.state;

    if (newSort === sort) {
      const newDirection = direction === 'ASC' ? 'DESC' : 'ASC';

      this.setState({ direction: newDirection }, this.persistToUrl);
    } else {
      this.setState({ sort: newSort, direction: 'ASC' }, this.persistToUrl);
    }
  };

  persistToUrl = () => {
    const { sort, direction, filters } = this.state;
    const url = new URL(
      // current location w/o query params
      window.location.toString().replace(window.location.search, '')
    );

    // rebuild query params from scratch
    if (sort) {
      url.searchParams.append('sort', sort);
    }

    if (direction) {
      url.searchParams.append('direction', direction);
    }

    Object.keys(filters).forEach(key => {
      const value = Array.isArray(filters[key])
        ? filters[key].map(obj => {
            return {
              value: obj.filterValue,
              name: obj.pillValue,
            };
          })
        : {
            value: filters[key].filterValue,
            name: filters[key].pillValue,
          };

      url.searchParams.append(key, JSON.stringify(value));
    });

    if (window.history && window.history.pushState) {
      window.history.pushState({ path: url.href }, '', url.href);
    }
  };

  handleCheckboxChange = (data, numRows) => {
    const { changeAllRows, selectedRows } = this.props;

    if (selectedRows.length < numRows) {
      changeAllRows(data, 'all');
    } else {
      changeAllRows(data, 'none');
    }
  };

  // will get set inside of <Query>
  refetch = () => null;

  render() {
    const {
      query,
      renderRows,
      dataPath,
      columnGroups,
      selectedRows,
      renderSelectionRow,
      resolveMutation,
      deleteQuery,
      changeAllRows,
      pollInterval,
      customClasses = {},
      HeaderContainer = Fragment,
      FilterPillContainer = Fragment,
      renderFilterPillsOutsideHeaderContainer,
      disablePaginationIfRowCountUnder,
      onCompleted,
      fetchPolicy,
      dataArray,
      doFilterAndSort,
      noDataText,
      renderHeaderIfNoData,
    } = this.props;
    const {
      filters,
      rowsPerPage,
      currentPage,
      sort,
      direction,
      forcePausePolling,
    } = this.state;
    let DataProvider;
    let dataProviderProps;

    if (dataArray) {
      DataProvider = ArrayProvider;
      dataProviderProps = {
        data: dataArray,
        variables: this.getVariables(),
        doFilterAndSort,
      };
    } else {
      DataProvider = Query;
      dataProviderProps = {
        query,
        variables: this.getVariables(),
        pollInterval: forcePausePolling ? 0 : pollInterval,
        onCompleted,
        fetchPolicy,
      };
    }

    return (
      <DataProvider {...dataProviderProps}>
        {({ data, error, refetch }) => {
          // hack to allow parent components to force refetch, e.g. to implement
          // "Check for New Files" button
          this.refetch = refetch;

          if (error) {
            throw error;
          }

          this.pageInfo = get(data, `${dataPath}.pageInfo`, this.pageInfo);

          const numRows = get(data, `${dataPath}.edges`, []).length;
          const haveData = numRows > 0;
          const haveFilters = Object.keys(filters).length > 0;
          const renderHeader =
            renderHeaderIfNoData || haveData || (!haveData && haveFilters);
          const totalCount = get(
            data,
            `${dataPath}.totalCount`,
            Number.MAX_SAFE_INTEGER
          );
          const haveTotalCount = totalCount !== Number.MAX_SAFE_INTEGER;

          return (
            <ApolloConsumer>
              {client => (
                <Fragment>
                  {renderSelectionRow && (
                    <SelectionRow
                      changeAllRows={changeAllRows}
                      getVariables={this.getVariables}
                      resolveMutation={resolveMutation}
                      selected={selectedRows}
                      deleteQuery={deleteQuery}
                      refetchQuery={query}
                    />
                  )}
                  {renderHeader && (
                    <HeaderContainer>
                      <Grid
                        className={customClasses.headerContainer}
                        container
                        alignItems="center"
                      >
                        {columnGroups.map(columnGroup => (
                          <Grid
                            item
                            xs={columnGroup.width}
                            container
                            alignItems="center"
                            key={`column-outer-${columnGroup.columns[0].name}`}
                          >
                            {columnGroup.columns.map(column => (
                              <Grid
                                key={`column-inner-${column.name}`}
                                item
                                xs={column.width}
                                className={column.containerClass}
                              >
                                {column.type === 'SELECT_ALL' ? (
                                  <Checkbox
                                    checked={selectedRows.length === numRows}
                                    indeterminate={
                                      selectedRows.length > 0 &&
                                      selectedRows.length < numRows
                                    }
                                    onChange={() =>
                                      this.handleCheckboxChange(data, numRows)
                                    }
                                  />
                                ) : (
                                  <InteractiveColumnHeader
                                    handleFilter={this.handleFilter}
                                    client={client}
                                    handleSort={this.handleSort}
                                    sorted={
                                      column.sortKey && column.sortKey === sort
                                    }
                                    direction={direction}
                                    pausePolling={this.pausePolling}
                                    restartPolling={this.restartPolling}
                                    filterState={
                                      filters[
                                        get(
                                          column,
                                          'filterOptions.rowsQueryFilterKey',
                                          null
                                        )
                                      ]
                                    }
                                    startTimeFilterState={
                                      filters[
                                        get(
                                          column,
                                          'filterOptions.menuOptions.dateTimeFilterOptions.startTimeFilterKey',
                                          null
                                        )
                                      ]
                                    }
                                    endTimeFilterState={
                                      filters[
                                        get(
                                          column,
                                          'filterOptions.menuOptions.dateTimeFilterOptions.endTimeFilterKey',
                                          null
                                        )
                                      ]
                                    }
                                    {...column}
                                  />
                                )}
                              </Grid>
                            ))}
                          </Grid>
                        ))}
                      </Grid>
                      {!renderFilterPillsOutsideHeaderContainer && (
                        <FilterPillContainer>
                          {this.renderFilterPills()}
                        </FilterPillContainer>
                      )}
                    </HeaderContainer>
                  )}
                  {renderFilterPillsOutsideHeaderContainer &&
                    Object.keys(filters).length > 0 && (
                      <FilterPillContainer>
                        {this.renderFilterPills()}
                      </FilterPillContainer>
                    )}
                  {!haveData && (
                    <Paper elevation={0} square>
                      <Typography className={customClasses.noData}>
                        {haveFilters ? noDataAfterFiltersText : noDataText}
                      </Typography>
                    </Paper>
                  )}
                  <div>{renderRows(data, this.getVariables)}</div>
                  {totalCount >= disablePaginationIfRowCountUnder && haveData && (
                    <TablePagination
                      ActionsComponent={TablePaginationActionsWithFirstPage}
                      component="div"
                      rowsPerPage={rowsPerPage}
                      count={totalCount}
                      labelDisplayedRows={({ from, to }) =>
                        `${from}-${to} of ${
                          haveTotalCount ? totalCount : 'Many'
                        }`
                      }
                      page={currentPage}
                      onChangeRowsPerPage={this.handleChangeRowsPerPage}
                      onChangePage={this.handleChangePage}
                      rowsPerPageOptions={[10, 25, 50, 100, 200]}
                      nextIconButtonProps={{
                        disabled: !get(this.pageInfo, 'hasNextPage', true),
                      }}
                    />
                  )}
                </Fragment>
              )}
            </ApolloConsumer>
          );
        }}
      </DataProvider>
    );
  }
}

export default withStyles(styles)(MTTable);
