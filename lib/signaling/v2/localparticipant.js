'use strict';

const LocalParticipantSignaling = require('../localparticipant');
const LocalTrackPublicationV2 = require('./localtrackpublication');

/**
 * @extends ParticipantSignaling
 * @property {number} revision
 * @emits LocalParticipantV2#updated
 */
class LocalParticipantV2 extends LocalParticipantSignaling {
  /**
   * Construct a {@link LocalParticipantV2}.
   * @param {EncodingParametersImpl} encodingParameters
   * @param {object} [options]
   */
  constructor(encodingParameters, options) {
    options = Object.assign({
      LocalTrackPublicationV2
    }, options);

    super();
    Object.defineProperties(this, {
      _encodingParameters: {
        value: encodingParameters
      },
      _removeListeners: {
        value: new Map()
      },
      _LocalTrackPublicationV2: {
        value: options.LocalTrackPublicationV2
      },
      _publishedRevision: {
        writable: true,
        value: 0
      },
      _revision: {
        writable: true,
        value: 1
      },
      revision: {
        enumerable: true,
        get() {
          return this._revision;
        }
      }
    });
  }

  /**
   * Set the {@link EncodingParameters}.
   * @param {?EncodingParameters} encodingParameters
   * @returns {this}
   */
  setParameters(encodingParameters) {
    this._encodingParameters.update(encodingParameters);
    return this;
  }

  /**
   * Update the {@link LocalParticipantV2} with the new state.
   * @param {Published} published
   * @returns {this}
   */
  update(published) {
    if (this._publishedRevision >= published.revision) {
      return this;
    }

    this._publishedRevision = published.revision;

    published.tracks.forEach(function(publicationState) {
      const localTrackPublicationV2 = this.tracks.get(publicationState.id);
      if (localTrackPublicationV2) {
        localTrackPublicationV2.update(publicationState);
      }
    }, this);

    return this;
  }

  /**
   * @protected
   * @param {DataTrackSender|MediaTrackSender} trackSender
   * @param {string} name
   * @returns {LocalTrackPublicationV2}
   */
  _createLocalTrackPublicationSignaling(trackSender, name) {
    return new this._LocalTrackPublicationV2(trackSender, name);
  }

  /**
   * Add a {@link LocalTrackPublicationV2} for the given {@link DataTrackSender}
   * or {@link MediaTrackSender} to the {@link LocalParticipantV2}.
   * @param {DataTrackSender|MediaTrackSender} trackSender
   * @param {string} name
   * @returns {this}
   */
  addTrack(trackSender, name) {
    super.addTrack(trackSender, name);
    const publication = this.getPublication(trackSender);

    let { sid } = publication;

    const updated = () => {
      // NOTE(mmalavalli): The LocalParticipantV2's state is only published if
      // the "updated" event is emitted due to LocalTrackPublicationV2's
      // .isEnabled being toggled. We do not publish if it is fired due to the
      // LocalTrackPublicationV2's .sid being set.
      if (sid === publication.sid) {
        this.didUpdate();
        return;
      }
      sid = publication.sid;
    };

    publication.on('updated', updated);

    this._removeListener(publication);
    this._removeListeners.set(publication, () => publication.removeListener('updated', updated));

    this.didUpdate();

    return this;
  }

  /**
   * @private
   * @param {LocalTrackPublicationV2} publication
   * @returns {void}
   */
  _removeListener(publication) {
    const removeListener = this._removeListeners.get(publication);
    if (removeListener) {
      removeListener();
    }
  }

  /**
   * Get the current state of the {@link LocalParticipantV2}.
   * @returns {object}
   */
  getState() {
    return {
      revision: this.revision,
      tracks: Array.from(this.tracks.values()).map(track => track.getState())
    };
  }

  /**
   * Increment the revision for the {@link LocalParticipantV2}.
   * @private
   * @returns {void}
   */
  didUpdate() {
    this._revision++;
    this.emit('updated');
  }

  /**
   * Remove the {@link LocalTrackPublicationV2} for the given {@link DataTrackSender}
   * or {@link MediaTrackSender} from the {@link LocalParticipantV2}.
   * @param {DataTrackSender|MediaTrackSender} trackSender
   * @returns {?LocalTrackPublicationV2}
   */
  removeTrack(trackSender) {
    const publication = super.removeTrack(trackSender);
    if (publication) {
      this._removeListener(publication);
      this.didUpdate();
    }
    return publication;
  }
}

/**
 * @interface Published
 * @property {number} revision
 * @property {Array<PublishedTrack>} tracks
 */

/**
 * @typedef {CreatedTrack|ReadyTrack|FailedTrack} PublishedTrack
 */

/**
 * @interface CreatedTrack
 * @property {Track.ID} id
 * @property {string} state - "created"
 */

/**
 * @interface ReadyTrack
 * @property {Track.ID} id
 * @property {Track.SID} sid
 * @property {string} state - "ready"
 */

/**
 * @interface FailedTrack
 * @property {Track.ID} id
 * @property {TrackError} error
 * @property {string} state - "failed"
 */

/**
 * @interface TrackError
 * @property {number} code
 * @property {string} message
 */

/**
 * @event LocalParticipantV2#updated
 */

module.exports = LocalParticipantV2;
