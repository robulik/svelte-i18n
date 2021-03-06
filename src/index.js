import deepmerge from 'deepmerge'
import resolvePath from 'object-resolve-path'
import { capital, title, upper, lower } from './utils'
import Formatter from './formatter'

export { capital, title, upper, lower }

export function i18n(store, { dictionary: initialDictionary }) {
  const formatter = new Formatter()
  let currentLocale
  let dictionary = Array.isArray(initialDictionary)
    ? deepmerge.all(initialDictionary)
    : initialDictionary

  const getLocalizedMessage = (
    path,
    interpolations,
    locale = currentLocale,
    transformers = undefined,
  ) => {
    let message = resolvePath(dictionary[locale], path)

    if (!message) return path

    if (transformers) {
      for (let i = 0, len = transformers.length; i < len; i++) {
        message = transformers[i](message)
      }
    }

    if (interpolations) {
      message = formatter.interpolate(message, interpolations).join('')
    }

    return message.trim()
  }

  const utilities = {
    capital(path, interpolations, locale) {
      return capital(getLocalizedMessage(path, interpolations, locale))
    },
    title(path, interpolations, locale) {
      return title(getLocalizedMessage(path, interpolations, locale))
    },
    upper(path, interpolations, locale) {
      return upper(getLocalizedMessage(path, interpolations, locale))
    },
    lower(path, interpolations, locale) {
      return lower(getLocalizedMessage(path, interpolations, locale))
    },
    plural(path, counter, interpolations, locale) {
      return getLocalizedMessage(path, interpolations, locale, [
        message => {
          const parts = message.split('|')

          /** Check for 'singular|plural' or 'zero|one|multiple' pluralization */
          const isSimplePluralization = parts.length === 2
          let choice = isSimplePluralization ? 1 : 0

          if (typeof counter === 'number') {
            choice = Math.min(
              Math.abs(counter) - (isSimplePluralization ? 1 : 0),
              parts.length - 1,
            )
          }

          return parts[choice]
        },
      ])
    },
  }

  store.on('locale', newLocale => {
    if (!Object.keys(dictionary).includes(newLocale)) {
      console.error(`[svelte-i18n] Couldn't find the "${newLocale}" locale.`)
      return
    }
    currentLocale = newLocale
    const _ = getLocalizedMessage

    _.upper = utilities.upper
    _.lower = utilities.lower
    _.title = utilities.title
    _.capital = utilities.capital
    _.plural = utilities.plural

    store.set({ locale: newLocale, _ })
  })

  store.i18n = {
    setLocale(locale) {
      store.fire('locale', locale)
    },
    extendDictionary(...list) {
      dictionary = deepmerge.all([dictionary, ...list])
    },
  }

  return store
}
