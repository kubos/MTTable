import React, { Component, createRef } from 'react';
import { array, func } from 'prop-types';
import { debounce } from 'lodash';
import {Menu, MenuItem, TextField, withStyles} from '@material-ui/core';

/**
 * This component renders a text input for the user to type in their filter text, and sends that
 * typed text to the passed `onInputChange` prop that can be used to filter, either locally or
 * against a server.
 */
class TypeaheadMenu extends Component {
  static propTypes = {
    onInputChange: func,
    onSubmit: func.isRequired,
    options: array,
  };

  static defaultProps = {
    onInputChange: x => x,
    options: [],
  };

  inputRef = createRef();

  handleInput = debounce(value => this.props.onInputChange(value), 25);

  handleInputWithoutDebounce = value => {
    this.props.onInputChangeWithoutDebounce(value);
  };

  submitSelectedOption = (value, name) => () => {
    this.props.onSubmit(value, name);
  };

  submitTypedText = term => evt => {
    evt.preventDefault();

    if (this.props.noSubstring || this.props.noPartialSearch) {
      return;
    }

    this.props.onSubmit(term);
  };

  render() {
    const {
      anchorEl,
      inputError,
      inputLabel,
      noSubstring,
      onClose,
      onFocus,
      open,
      options,
      placeholder,
      typeaheadSearch,
    } = this.props;

    return (
      <Menu
        anchorEl={anchorEl}
        onClose={onClose}
        onEntered={() => {
          // Give the text input focus when the menu opens, so the user doesn't have to click into
          // it to start typing.
          if (this.inputRef && this.inputRef.current) {
            this.inputRef.current.focus();
          }
        }}
        open={open}
      >
        {!noSubstring && (
          <MenuItem
            onKeyUp={evt => {
              // Allow user to use the arrow key to select an item from the menu below.
              if (evt.key === 'ArrowDown') {
                evt.currentTarget.nextElementSibling.focus();
              }

              // Allow the user to re-focus the input by hitting enter when this item is highlighted.
              if (
                evt.key === 'Enter' &&
                this.inputRef &&
                this.inputRef.current
              ) {
                this.inputRef.current.focus();
              }
            }}
          >
            <form noValidate onSubmit={this.submitTypedText(typeaheadSearch)}>
              <TextField
                error={!!inputError}
                fullWidth
                helperText={inputError}
                inputProps={{ ref: this.inputRef }}
                label={inputLabel}
                value={typeaheadSearch}
                onChange={evt => {
                  if (this.props.onInputChangeWithoutDebounce) {
                    return this.handleInputWithoutDebounce(evt.target.value);
                  }

                  return this.handleInput(evt.target.value);
                }}
                onFocus={onFocus}
                placeholder={placeholder || 'Start Typing for Selections'}
              />
            </form>
          </MenuItem>
        )}
        {options.map(({ name, value }) => (
          <MenuItem
            key={`${value}`}
            onClick={this.submitSelectedOption(name, value)}
            value={value}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>
    );
  }
}

export default TypeaheadMenu;
