const path = require('path')
const spawn = require('child_process').spawn
const _ = require('lodash/fp')
const pify = require('pify')

const commitTemplate =
  '<%= (newContributor ? "Add" : "Update") %> @<%= username %> as a contributor'

const getRemoteOriginData = pify(cb => {
  let output = ''
  const git = spawn('git', 'config --get remote.origin.url'.split(' '))
  git.stdout.on('data', data => {
    output += data
  })

  git.stderr.on('data', cb)
  git.on('close', () => {
    cb(null, output)
  })
})

function parse(originUrl) {
  const result = /:(\w+)\/([A-Za-z0-9-_]+)/.exec(originUrl)
  if (!result) {
    return null
  }

  return {
    projectOwner: result[1],
    projectName: result[2],
  }
}

function getRepoInfo() {
  return getRemoteOriginData().then(parse)
}

const spawnGitCommand = pify((args, cb) => {
  const git = spawn('git', args)
  git.stderr.on('data', cb)
  git.on('close', cb)
})

function commit(options, data) {
  const files = options.files.concat(options.config)
  const absolutePathFiles = files.map(file => {
    return path.resolve(process.cwd(), file)
  })
  return spawnGitCommand(['add'].concat(absolutePathFiles)).then(() => {
    const commitMessage = _.template(options.commitTemplate || commitTemplate)(
      data,
    )
    return spawnGitCommand(['commit', '-m', commitMessage])
  })
}

module.exports = {
  commit,
  getRepoInfo,
}
