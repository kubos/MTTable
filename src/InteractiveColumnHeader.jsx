// MIT License
//
// Copyright (c) 2020 Kubos Corporation
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import React, { Component, Fragment, createRef } from 'react';
import classNames from 'classnames';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Grow,
  ListItemText,
  TextField,
  withStyles,
} from '@material-ui/core';
import { get, debounce, uniqBy } from 'lodash';
import { MuiPickersUtilsProvider, DateTimePicker } from 'material-ui-pickers';
import {
  ArrowDownward,
  ArrowUpward,
  Tune as FilterIcon,
  Help as QuestionMark,
} from '@material-ui/icons';
import MomentUtils from '@date-io/moment';
import {
  bool,
  string,
  number,
  shape,
  func,
  oneOf,
  oneOfType,
} from 'prop-types';
import TypeaheadMenu from './TypeaheadMenu';
import moment from 'moment';

const sortIcons = {
  ASC: ArrowDownward,
  DESC: ArrowUpward,
};
const validateMenuOptions = props => {
  if (!props.filterOptions) {
    return undefined;
  }

  const typeahead = get(
    props,
    'filterOptions.menuOptions.typeaheadQueryOptions',
    false
  );
  const fixed = get(props, 'filterOptions.menuOptions.fixedMenuOptions', false);
  const dateTime = get(
    props,
    'filterOptions.menuOptions.dateTimeFilterOptions',
    false
  );

  if (!typeahead && !fixed && !dateTime) {
    return new Error(
      'one of typeaheadQueryOptions, dateTimeFilterOptions, or fixedMenuOptions is required'
    );
  }

  if (typeahead) {
    const opts = typeahead;

    if (!opts.query || !opts.queryFilterKey || !opts.dataPath) {
      return new Error(
        'typeaheadQueryOptions requires query, queryFilterKey, and dataPath'
      );
    }
  }

  if (dateTime) {
    const opts = dateTime;

    if (!opts.startTimeFilterKey || !opts.endTimeFilterKey) {
      return new Error(
        'dateTimeFilterOptions requires startTimeFilterKey and endTimeFilterKey'
      );
    }
  }
};

const styles = theme => ({
  clickable: {
    color: theme.palette.primary.contrastText,
    cursor: 'pointer',
    fontWeight: 100,
    '-webkit-user-select': 'none', // webkit (safari, chrome) browsers
    '-moz-user-select': 'none', // mozilla browsers
    '-ms-user-select': 'none', // IE10+
    'user-select': 'none', // IE10+
  },
  notClickable: {
    color: theme.palette.primary.contrastText,
    fontWeight: 100,
  },
  bold: {
    fontWeight: 'bold',
  },
  invisible: {
    opacity: 0,
    marginRight: theme.spacing.double * -1,
  },
  whiteSortButton: {
    color: 'white !important',
    marginRight: theme.spacing.double * -1,
  },
});

class InteractiveColumnHeader extends Component {
  static propTypes = {
    name: string.isRequired,
    width: oneOfType([number, bool]).isRequired, // can be bool for xs=true
    customTooltip: string,
    bold: bool,
    type: oneOf(['SELECT_ALL']),
    containerClass: string,
    sortKey: string,
    filterOptions: shape({
      rowsQueryFilterKey: string, // not required if dateTimeFilterOptions is used
      rowsQuerySubstringFilterKey: string,
      pillLabel: string,
      menuOptions: shape({
        typeaheadQueryOptions: validateMenuOptions,
        dateTimeFilterOptions: validateMenuOptions,
        fixedMenuOptions: validateMenuOptions,
        nameValueFromNodeArray: func, // not required if dateTimeFilterOptions is used
        filterOnValue: bool,
        noTextSearch: bool,
        noPartialSearch: bool,
        showAllImmediately: bool,
        replaceExistingFilter: bool,
      }).isRequired,
    }),
  };

  static defaultProps = {
    customTooltip: undefined,
    bold: false,
    type: undefined,
    containerClass: undefined,
    sortKey: undefined,
    filterOptions: undefined,
  };

  constructor(props) {
    super(props);

    this.state = {
      filterMenuOpen: false,
      dateTimeMenuOpen: false,
      filterAnchor: null,
      searchTerm: '',
      workingOptions: [],
    };

    this.startTimePicker = createRef();
    this.endTimePicker = createRef();
  }

  closeFilterMenu = () => {
    this.setState(
      {
        filterMenuOpen: false,
        searchTerm: '',
        filterAnchor: null,
      },
      this.props.restartPolling
    );
  };

  getShowOptions = () => {
    const { filterOptions } = this.props;
    const { searchTerm } = this.state;
    const showAllImmediately = get(
      filterOptions,
      'menuOptions.showAllImmediately',
      false
    );
    const noTextSearch = get(filterOptions, 'menuOptions.noTextSearch', false);

    return (
      noTextSearch ||
      showAllImmediately ||
      (searchTerm && searchTerm.length >= 3)
    );
  };

  handleInputChange = (client, query, dataPath) => searchTerm => {
    const { filterOptions } = this.props;
    const fixedMenuOptions = get(
      filterOptions,
      'menuOptions.fixedMenuOptions',
      null
    );
    const noTextSearch = get(filterOptions, 'menuOptions.noTextSearch', false);

    if (fixedMenuOptions && !noTextSearch) {
      this.setState(
        {
          searchTerm,
        },
        // (note getShowOptions depends on state.searchTerm being up to date)
        () => {
          let workingOptions = [];

          if (this.getShowOptions()) {
            workingOptions = fixedMenuOptions.filter(option =>
              option.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }

          this.setState({ workingOptions });
        }
      );

      return;
    }

    this.setState(
      { searchTerm },
      debounce(async () => {
        const result =
          this.getShowOptions() &&
          (await client.query({
            query,
            fetchPolicy: 'no-cache',
            variables: this.getFilterMenuVariables(),
          }));
        const workingOptions = get(result, dataPath, []).map(
          ({ node }) => node
        );

        this.setState({ workingOptions });
      }, 100)
    );
  };

  getFilterMenuVariables = () => {
    const { searchTerm } = this.state;
    const { filterOptions } = this.props;
    const variables = get(
      filterOptions,
      'menuOptions.typeaheadQueryOptions.queryVariables',
      {}
    );
    const queryFilterKey = get(
      filterOptions,
      'menuOptions.typeaheadQueryOptions.queryFilterKey',
      'nameSubstring'
    );
    const noTextSearch = get(filterOptions, 'menuOptions.noTextSearch', false);

    return {
      ...variables,
      filters: {
        ...variables.filters,
        [queryFilterKey]: noTextSearch ? undefined : searchTerm,
      },
    };
  };

  handleFilter = (name, value) => {
    const { handleFilter, filterOptions } = this.props;
    const {
      rowsQueryFilterKey,
      rowsQuerySubstringFilterKey,
      pillLabel = 'Filter',
    } = filterOptions;
    const replaceExistingFilter = get(
      filterOptions,
      'menuOptions.replaceExistingFilter',
      false
    );
    const filterOnValue = get(filterOptions, 'menuOptions.filterOnValue', true);
    let filterKey = rowsQueryFilterKey;
    let filterValue = filterOnValue ? value : name;
    let actualPillLabel = pillLabel;
    let isSingle = replaceExistingFilter;

    if (!filterValue) {
      if (rowsQuerySubstringFilterKey) {
        filterKey = rowsQuerySubstringFilterKey;
        actualPillLabel = `${pillLabel} Contains`;
        isSingle = true;
      }

      filterValue = name;
    }

    handleFilter({
      filterKey,
      filterValue,
      pillLabel: actualPillLabel,
      pillValue: name,
      isSingle,
    });
    this.closeFilterMenu();
  };

  handleDateTimeFilter = (filterKey, filterValue, pillLabel, pillValue) => {
    const { handleFilter } = this.props;

    handleFilter({
      filterKey,
      filterValue, // timestamp in seconds
      pillLabel, // e.g. 'start' or 'end'
      pillValue, // the formatted timestamp
      isSingle: true,
    });
  };

  /**
   * Avoid distracting transition behavior and weird text placement by conditionally rendering this
   * menu item component.  If we have a value, render it as an input with the snazzy MUI label
   * positioning etc.  If there's no value, just render a cleanly styled menu list item.  Since it's
   * not an input, we'll need to use a ref to programmatically open the picker, which is set up in
   * the constructor, and here determined by the `which` property.
   * @param {String} [which] Refers to the start time picker if this is "start", end time otherwise
   */
  PickerInput = which => props => {
    const { classes } = this.props;
    const { children, value, InputProps, ...rest } = props;

    // I am not sure why the value is set to "Unknown" when a user clears the picker, but I suspect
    // it may have to do with the interaction between updating the url and the render lifecycle.
    // Here's a hack to hide it for now ¯\_(ツ)_/¯
    if (!value || value === 'Unknown') {
      return (
        <ListItemText
          className={classes.pickerListItem}
          primaryTypographyProps={{ className: classes.pickerMenuTextColor }}
          onClick={this.openPickerRef(which)}
        >
          {which === 'start' ? 'Start Time (UTC)' : 'End Time (UTC)'}
        </ListItemText>
      );
    }

    return (
      <TextField
        InputProps={{ disableUnderline: true }}
        value={value}
        {...rest}
      >
        {children}
      </TextField>
    );
  };

  /**
   * HOF that opens the correct picker based on the `which` param.
   * @param {String} [which] If equal to "start" opens the start time picker, otherwise the end time
   */
  openPickerRef = which => evt => {
    if (which === 'start') {
      return (
        this.startTimePicker.current && this.startTimePicker.current.open(evt)
      );
    }

    return this.endTimePicker.current && this.endTimePicker.current.open(evt);
  };

  changeTime = which => val => {
    const { filterOptions } = this.props;
    const startTimeFilterKey = get(
      filterOptions,
      'menuOptions.dateTimeFilterOptions.startTimeFilterKey',
      'startUpdatedTime'
    );
    const endTimeFilterKey = get(
      filterOptions,
      'menuOptions.dateTimeFilterOptions.endTimeFilterKey',
      'endUpdatedTime'
    );
    const value = val ? val.valueOf() : '';
    const pillValue = moment(Number(value))
      .utc()
      .format();
    let pillLabel = which;
    let filterKey = `${which}UpdatedTime`; // default if not specified

    if (which === 'start' && startTimeFilterKey) {
      filterKey = startTimeFilterKey;
    }

    if (which === 'end' && endTimeFilterKey) {
      filterKey = endTimeFilterKey;
    }

    if (which === 'start') {
      pillLabel = 'After';
    } else if (which === 'end') {
      pillLabel = 'Before';
    }

    this.setState({ dateTimeMenuOpen: false, filterAnchor: null }, () => {
      this.handleDateTimeFilter(filterKey, value, pillLabel, pillValue);
      this.props.restartPolling();
    });
  };

  getWorkingOptions = () => {
    const { filterOptions, filterState } = this.props;
    const { workingOptions } = this.state;
    const nameValueFromNodeArray = get(
      filterOptions,
      'menuOptions.nameValueFromNodeArray',
      null
    );
    const options = uniqBy(nameValueFromNodeArray(workingOptions), 'value');

    if (!filterState) {
      return options;
    }

    if (Array.isArray(filterState)) {
      return options.filter(opt => {
        const names = filterState.map(filter => filter.pillValue);

        return !names.includes(opt.name);
      });
    }

    return options.filter(opt => opt.name !== filterState.pillValue);
  };

  render() {
    const {
      client,
      customTooltip,
      name,
      filterOptions,
      classes,
      handleSort,
      sortKey,
      sorted,
      direction,
      bold,
      startTimeFilterState,
      endTimeFilterState,
    } = this.props;
    const {
      filterMenuOpen,
      filterAnchor,
      dateTimeMenuOpen,
      searchTerm,
    } = this.state;
    const noPartialSearch = get(
      filterOptions,
      'menuOptions.noPartialSearch',
      false
    );
    const fixedMenuOptions = get(
      filterOptions,
      'menuOptions.fixedMenuOptions',
      null
    );
    const noTextSearch = get(filterOptions, 'menuOptions.noTextSearch', false);
    const dateTimeFilterOptions = get(
      filterOptions,
      'menuOptions.dateTimeFilterOptions',
      null
    );
    const query = get(
      filterOptions,
      'menuOptions.typeaheadQueryOptions.query',
      null
    );
    const dataPath = get(
      filterOptions,
      'menuOptions.typeaheadQueryOptions.dataPath',
      null
    );
    const filterable = Boolean(filterOptions);
    const dateTimeFilterable = Boolean(dateTimeFilterOptions);
    const SortIcon = (sorted && sortIcons[direction]) || FilterIcon;
    const startTimeVal =
      (startTimeFilterState && Number(startTimeFilterState.filterValue)) ||
      null;
    const endTimeVal =
      (endTimeFilterState && Number(endTimeFilterState.filterValue)) || null;

    return (
      <Fragment>
        <Tooltip title={customTooltip || (sortKey ? 'Sort' : '')}>
          <span>
            <span
              className={classNames(
                bold ? classes.bold : null,
                sortKey ? classes.clickable : classes.notClickable
              )}
              onClick={sortKey ? () => handleSort(sortKey) : undefined}
              onKeyDown={evt => {
                if (evt.key === 'Enter' && sortKey) handleSort(sortKey);
              }}
              role="button"
              tabIndex={sortKey ? '0' : undefined}
            >
              {name}
              {customTooltip && (
                <QuestionMark
                  style={{
                    height: 16,
                    width: 16,
                    marginLeft: 4,
                    marginBottom: -4,
                  }}
                />
              )}
            </span>
            {(sorted || !filterable) && (
              <IconButton
                classes={{
                  // Kind of hacky, but having an invisible button here maintains the element's
                  // height even when this column is not sorted, sortable, or filterable.
                  disabled: sorted
                    ? classes.whiteSortButton
                    : classes.invisible,
                  root: sorted ? classes.whiteSortButton : classes.invisible,
                }}
                disabled={!sorted}
                onClick={sortKey ? () => handleSort(sortKey) : undefined}
              >
                <SortIcon fontSize="small" />
              </IconButton>
            )}
          </span>
        </Tooltip>
        {(filterable || dateTimeFilterable) && (
          <Tooltip title={`Filter by ${name}`}>
            <IconButton
              disabled={filterMenuOpen}
              onClick={async evt => {
                const filterAnchor = evt.currentTarget;

                if (dateTimeFilterable) {
                  this.setState(
                    {
                      filterAnchor,
                      dateTimeMenuOpen: true,
                    },
                    this.props.pausePolling
                  );
                } else {
                  let workingOptions = [];

                  if (fixedMenuOptions && noTextSearch) {
                    workingOptions = fixedMenuOptions;
                  } else if (fixedMenuOptions && !noTextSearch) {
                    if (this.getShowOptions()) {
                      workingOptions = fixedMenuOptions.filter(option =>
                        option.includes(searchTerm)
                      );
                    }
                  } else {
                    const result =
                      this.getShowOptions() &&
                      (await client.query({
                        query,
                        fetchPolicy: 'no-cache',
                        variables: this.getFilterMenuVariables(),
                      }));

                    workingOptions = get(result, dataPath, []).map(
                      ({ node }) => node
                    );
                  }

                  this.setState(
                    {
                      filterAnchor,
                      filterMenuOpen: true,
                      workingOptions,
                    },
                    this.props.pausePolling
                  );
                }
              }}
            >
              <FilterIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {filterable && !dateTimeFilterable && (
          <TypeaheadMenu
            anchorEl={filterAnchor}
            onClose={this.closeFilterMenu}
            onInputChange={this.handleInputChange(client, query, dataPath)}
            onSubmit={this.handleFilter}
            open={filterMenuOpen}
            options={this.getWorkingOptions()}
            placeholder={`Filter by ${name}`}
            typeaheadSearch={this.state.searchTerm || ''}
            noSubstring={noTextSearch}
            noPartialSearch={noPartialSearch}
          />
        )}
        {dateTimeFilterable && (
          <Menu
            anchorEl={filterAnchor}
            open={Boolean(dateTimeMenuOpen)}
            onClose={() =>
              this.setState(
                { dateTimeMenuOpen: false, filterAnchor: null },
                this.props.restartPolling
              )
            }
            TransitionComponent={Grow}
            className={classes.filterMenu}
          >
            <MenuItem>
              <MuiPickersUtilsProvider
                utils={MomentUtils}
                moment={moment.utc}
              >
                <DateTimePicker
                  margin="normal"
                  label="Start Time (UTC)"
                  ampm={false}
                  onChange={this.changeTime('start')}
                  value={startTimeVal}
                  clearable
                  format="YYYY-MM-DD HH:mm:ss[Z]"
                  ref={this.startTimePicker}
                  TextFieldComponent={this.PickerInput('start')}
                />
              </MuiPickersUtilsProvider>
            </MenuItem>
            <MenuItem>
              <MuiPickersUtilsProvider
                utils={MomentUtils}
                moment={moment.utc}
              >
                <DateTimePicker
                  margin="normal"
                  label="End Time (UTC)"
                  ampm={false}
                  onChange={this.changeTime('end')}
                  value={endTimeVal}
                  clearable
                  format="YYYY-MM-DD HH:mm:ss[Z]"
                  ref={this.endTimePicker}
                  TextFieldComponent={this.PickerInput('end')}
                />
              </MuiPickersUtilsProvider>
            </MenuItem>
          </Menu>
        )}
      </Fragment>
    );
  }
}

export default withStyles(styles)(InteractiveColumnHeader);
