const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')

const User = require('../models/User');

const RoleService = require('./RoleService')

// A valid bcrypt hash of a random string. Used to run a real hash comparison on
// the "user not found" path so that login response timing does not reveal
// whether a given username exists (username enumeration mitigation).
const DUMMY_PASSWORD_HASH = '$2b$12$0yqv7sKTo/C0fafah5OVCufu.kjJ1E81otr6GqSUYm0cwiOXepyxO';

class UserService {

  static async register(name, email, password) {

    // Ensure that username does not already exist
    let userCount = await User.query().where('name', name).resultSize();

    // if user does already exist, cancel
    if (userCount !== 0) {
      throw new Error("USER_ALREADY_EXISTS")
    }

    // Hash password
    let password_hash = await bcrypt.hash(password, 12)

    // Store user data in database
    await User.query().insert({
      name: name,
      email: email,
      password_hash: password_hash
    });
  }

  /**
   * @param {*} username 
   * @param {*} password 
   * @returns JWT string
   */
  static async login(name, password) {

    // Get user
    let users = await User.query().where('name', name);
    let user = users.length === 1 ? users[0] : null;

    // Always run one async bcrypt comparison, whether or not the account exists,
    // so both paths take comparable time and do not leak account existence.
    let passwordMatches = await bcrypt.compare(
      password,
      user ? user.password_hash : DUMMY_PASSWORD_HASH
    );

    if (!user || !passwordMatches) {
      throw new Error("INVALID_NAME_OR_PASSWORD");
    }

    let expiresIn = process.env.JWT_EXPIRES_IN || '12h';

    // Distribute JWT
    return jwt.sign({
      "user_id": user.id,
      "name": user.name
    }, process.env.JWT_TOKEN_SECRET, { expiresIn: expiresIn });
  }

  static async changePassword(userId, newPassword) {
    // Hash password
    let newPasswordHash = await bcrypt.hash(newPassword, 12)

    await User.query().patch({
      password_hash: newPasswordHash
    }).findById(userId);

    return;
  }

  /**
   * Returns an array of the roles for this user
   * @param {*} userId
   * @returns {Array or false}
   */
  static async getRoles(userId) {
    let user = await User.query().findById(userId)
    let roles = await user.$relatedQuery('roles')
    return roles
  }

  /**
   * Checks whether a specified user ID has a certain role
   * @param {*} userId 
   * @param {*} role ID or name
   * @returns {Boolean} Whether the user has this role orn ot
   */
  static async hasRole(userId, role) {
    role = await RoleService.getByIdOrName(role)
    let userRoles = await this.getRoles(userId)

    if(userRoles) {
      for (let userRole of userRoles) {
        if(userRole.id === role.id) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * @param {int} userId 
   * @param {int or string} permission as id or readable name
   * @returns {boolean} whether the user has this permission
   */
  static async hasPermission(userId, permission) {
    let roles = await this.getRoles(userId)

    for(let role of roles) {
      let hasPermission = await RoleService.hasPermission(role.id, permission)

      if(hasPermission === true) {
        return true
      } 
    }

    return false
  }
}

module.exports = UserService;